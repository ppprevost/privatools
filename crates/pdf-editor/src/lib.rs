use wasm_bindgen::prelude::*;
use serde::Deserialize;
use lopdf::{Document, Object, Dictionary, Stream, ObjectId};
use base64::{engine::general_purpose, Engine};

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum EditOp {
    Freetext {
        page: usize,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        text: String,
        #[serde(rename = "fontSize")]
        font_size: f64,
        color: [f64; 3],
        #[serde(default)]
        italic: bool,
        #[serde(default)]
        font: Option<String>,
    },
    Highlight {
        page: usize,
        #[serde(rename = "quadPoints")]
        quad_points: Vec<f64>,
        color: [f64; 3],
    },
    TextOverlay {
        page: usize,
        #[serde(rename = "coverRect")]
        cover_rect: [f64; 4],
        text: String,
        #[serde(rename = "fontSize")]
        font_size: f64,
        x: f64,
        y: f64,
        #[serde(default)]
        bold: bool,
        #[serde(default)]
        italic: bool,
        #[serde(default)]
        color: Option<[f64; 3]>,
    },
    FormText {
        #[serde(rename = "fieldName")]
        field_name: String,
        value: String,
    },
    FormCheckbox {
        #[serde(rename = "fieldName")]
        field_name: String,
        checked: bool,
    },
    FreetextImage {
        page: usize,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        #[serde(rename = "imageWidth")]
        image_width: u32,
        #[serde(rename = "imageHeight")]
        image_height: u32,
        #[serde(rename = "rgbB64")]
        rgb_b64: String,
        #[serde(rename = "alphaB64")]
        alpha_b64: String,
    },
}

#[wasm_bindgen]
pub fn apply_edits(pdf_bytes: &[u8], edits_json: &str) -> Result<Vec<u8>, JsValue> {
    let ops: Vec<EditOp> = serde_json::from_str(edits_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid edits JSON: {}", e)))?;

    let mut doc = Document::load_mem(pdf_bytes)
        .map_err(|e| JsValue::from_str(&format!("Failed to load PDF: {}", e)))?;

    for op in ops {
        apply_op(&mut doc, op)
            .map_err(|e| JsValue::from_str(&e))?;
    }

    let mut out = Vec::new();
    doc.save_to(&mut out)
        .map_err(|e| JsValue::from_str(&format!("Failed to save PDF: {}", e)))?;
    Ok(out)
}

#[wasm_bindgen]
pub fn get_form_fields(pdf_bytes: &[u8]) -> Result<JsValue, JsValue> {
    let doc = Document::load_mem(pdf_bytes)
        .map_err(|e| JsValue::from_str(&format!("Failed to load PDF: {}", e)))?;

    let mut fields = Vec::new();

    let acroform = doc.trailer
        .get(b"Root").ok()
        .and_then(|r| r.as_reference().ok())
        .and_then(|id| doc.get_object(id).ok())
        .and_then(|o| o.as_dict().ok())
        .and_then(|d| d.get(b"AcroForm").ok())
        .and_then(|af| af.as_reference().ok())
        .and_then(|id| doc.get_object(id).ok())
        .and_then(|o| o.as_dict().ok().map(|d| d.clone()));

    if let Some(acroform) = acroform {
        if let Ok(field_refs) = acroform.get(b"Fields") {
            if let Ok(arr) = field_refs.as_array() {
                for item in arr {
                    if let Ok(id) = item.as_reference() {
                        collect_field(&doc, id, &mut fields);
                    }
                }
            }
        }
    }

    let json = serde_json::to_string(&fields)
        .map_err(|e| JsValue::from_str(&format!("JSON error: {}", e)))?;
    Ok(JsValue::from_str(&json))
}

fn collect_field(doc: &Document, id: ObjectId, out: &mut Vec<serde_json::Value>) {
    let obj = match doc.get_object(id) {
        Ok(o) => o,
        Err(_) => return,
    };
    let dict = match obj.as_dict() {
        Ok(d) => d,
        Err(_) => return,
    };

    if let Ok(kids) = dict.get(b"Kids") {
        if let Ok(arr) = kids.as_array() {
            for kid in arr.clone() {
                if let Ok(kid_id) = kid.as_reference() {
                    collect_field(doc, kid_id, out);
                }
            }
            return;
        }
    }

    let name = dict.get(b"T")
        .ok()
        .and_then(|v| v.as_str().ok())
        .map(|s| String::from_utf8_lossy(s).into_owned())
        .unwrap_or_default();

    let ft = dict.get(b"FT")
        .ok()
        .and_then(|v| v.as_name_str().ok())
        .unwrap_or("Tx");

    let field_type = match ft {
        "Btn" => {
            let ff = dict.get(b"Ff")
                .ok()
                .and_then(|v| v.as_i64().ok())
                .unwrap_or(0);
            if ff & (1 << 15) != 0 { "radio" } else { "checkbox" }
        }
        "Ch" => "select",
        _ => "text",
    };

    let value = dict.get(b"V")
        .ok()
        .and_then(|v| match v {
            Object::String(bytes, _) => std::str::from_utf8(bytes).ok().map(String::from),
            Object::Name(bytes) => std::str::from_utf8(bytes).ok().map(String::from),
            _ => None,
        })
        .unwrap_or_default();

    if !name.is_empty() {
        out.push(serde_json::json!({
            "name": name,
            "field_type": field_type,
            "value": value,
        }));
    }
}

fn apply_op(doc: &mut Document, op: EditOp) -> Result<(), String> {
    match op {
        EditOp::Freetext { page, x, y, width, height, text, font_size, color, italic, .. } => {
            add_freetext(doc, page, x, y, width, height, &text, font_size, color, italic)
        }
        EditOp::Highlight { page, quad_points, color } => {
            add_highlight(doc, page, &quad_points, color)
        }
        EditOp::TextOverlay { page, cover_rect, text, font_size, x, y, bold, italic, color } => {
            add_text_overlay(doc, page, cover_rect, &text, font_size, x, y, bold, italic, color)
        }
        EditOp::FormText { field_name, value } => {
            set_form_text(doc, &field_name, &value)
        }
        EditOp::FormCheckbox { field_name, checked } => {
            set_form_checkbox(doc, &field_name, checked)
        }
        EditOp::FreetextImage { page, x, y, width, height, image_width, image_height, rgb_b64, alpha_b64 } => {
            add_freetext_image(doc, page, x, y, width, height, image_width, image_height, &rgb_b64, &alpha_b64)
        }
    }
}

fn get_page_id(doc: &Document, page_index: usize) -> Result<ObjectId, String> {
    let pages = doc.get_pages();
    let page_num = (page_index + 1) as u32;
    pages.get(&page_num)
        .copied()
        .ok_or_else(|| format!("Page {} not found", page_index))
}

fn escape_pdf_string(s: &str) -> String {
    s.replace('\\', "\\\\").replace('(', "\\(").replace(')', "\\)")
}

fn add_freetext(
    doc: &mut Document,
    page: usize,
    x: f64, y: f64, _width: f64, height: f64,
    text: &str,
    font_size: f64,
    color: [f64; 3],
    italic: bool,
) -> Result<(), String> {
    let page_id = get_page_id(doc, page)?;

    let font_alias = if italic { "HelI" } else { "Helv" };
    let line_height = font_size * 1.2;
    // First line baseline: near the top of the box (y + height - fontSize), small 2pt padding
    let start_x = x + 2.0;
    let start_y = y + height - font_size - 2.0;

    let mut ops: Vec<String> = vec![
        "BT".to_string(),
        format!("/{} {} Tf", font_alias, font_size),
        format!("{} {} {} rg", color[0], color[1], color[2]),
        format!("{} {} Td", start_x, start_y),
    ];

    let lines: Vec<&str> = text.split('\n').collect();
    for (i, line) in lines.iter().enumerate() {
        if i > 0 {
            ops.push(format!("0 -{:.2} Td", line_height));
        }
        ops.push(format!("({}) Tj", escape_pdf_string(line)));
    }
    ops.push("ET".to_string());

    let stream_content = ops.join("\n");
    let stream = Stream::new(
        Dictionary::from_iter([
            ("Length", Object::Integer(stream_content.len() as i64)),
        ]),
        stream_content.into_bytes(),
    );
    let stream_id = doc.add_object(Object::Stream(stream));

    let base_font: &[u8] = if italic { b"Helvetica-Oblique" } else { b"Helvetica" };
    let alias: &[u8] = if italic { b"HelI" } else { b"Helv" };
    ensure_font_on_page(doc, page_id, alias, base_font)?;
    prepend_content_stream(doc, page_id, stream_id)
}

fn add_highlight(
    doc: &mut Document,
    page: usize,
    quad_points: &[f64],
    color: [f64; 3],
) -> Result<(), String> {
    let page_id = get_page_id(doc, page)?;

    if quad_points.len() < 8 {
        return Err("quadPoints must have at least 8 values".into());
    }

    let xs: Vec<f32> = quad_points.iter().enumerate().filter(|(i, _)| i % 2 == 0).map(|(_, v)| *v as f32).collect();
    let ys: Vec<f32> = quad_points.iter().enumerate().filter(|(i, _)| i % 2 == 1).map(|(_, v)| *v as f32).collect();
    let min_x = xs.iter().cloned().fold(f32::INFINITY, f32::min);
    let min_y = ys.iter().cloned().fold(f32::INFINITY, f32::min);
    let max_x = xs.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
    let max_y = ys.iter().cloned().fold(f32::NEG_INFINITY, f32::max);

    let qp_objects: Vec<Object> = quad_points.iter().map(|v| Object::Real(*v as f32)).collect();

    let annot_dict = Dictionary::from_iter([
        ("Type", Object::Name(b"Annot".to_vec())),
        ("Subtype", Object::Name(b"Highlight".to_vec())),
        ("Rect", Object::Array(vec![
            Object::Real(min_x),
            Object::Real(min_y),
            Object::Real(max_x),
            Object::Real(max_y),
        ])),
        ("QuadPoints", Object::Array(qp_objects)),
        ("C", Object::Array(vec![
            Object::Real(color[0] as f32),
            Object::Real(color[1] as f32),
            Object::Real(color[2] as f32),
        ])),
        ("F", Object::Integer(4)),
    ]);

    let annot_id = doc.add_object(Object::Dictionary(annot_dict));
    push_annot(doc, page_id, annot_id)
}

fn add_text_overlay(
    doc: &mut Document,
    page: usize,
    cover_rect: [f64; 4],
    text: &str,
    font_size: f64,
    x: f64,
    y: f64,
    bold: bool,
    italic: bool,
    color: Option<[f64; 3]>,
) -> Result<(), String> {
    let page_id = get_page_id(doc, page)?;

    let (font_alias, base_font): (&[u8], &[u8]) = match (bold, italic) {
        (true, true)  => (b"HelvBI", b"Helvetica-BoldOblique"),
        (true, false) => (b"HelvB",  b"Helvetica-Bold"),
        (false, true) => (b"HelI",   b"Helvetica-Oblique"),
        _             => (b"Helv",   b"Helvetica"),
    };

    let [r, g, b] = color.unwrap_or([0.0, 0.0, 0.0]);
    let escaped = escape_pdf_string(text);
    let font_alias_str = std::str::from_utf8(font_alias).unwrap_or("Helv");
    let stream_content = format!(
        "q 1 1 1 rg {} {} {} {} re f Q BT /{} {} Tf {:.4} {:.4} {:.4} rg {} {} Td ({}) Tj ET",
        cover_rect[0], cover_rect[1], cover_rect[2], cover_rect[3],
        font_alias_str, font_size, r, g, b, x, y, escaped
    );

    let stream = Stream::new(
        Dictionary::from_iter([
            ("Length", Object::Integer(stream_content.len() as i64)),
        ]),
        stream_content.into_bytes(),
    );
    let stream_id = doc.add_object(Object::Stream(stream));

    ensure_font_on_page(doc, page_id, font_alias, base_font)?;
    prepend_content_stream(doc, page_id, stream_id)
}

fn add_font_to_dict(font_dict: &mut Dictionary, alias: &[u8], base_font: &[u8]) {
    if font_dict.get(alias).is_err() {
        let font_entry = Dictionary::from_iter([
            ("Type", Object::Name(b"Font".to_vec())),
            ("Subtype", Object::Name(b"Type1".to_vec())),
            ("BaseFont", Object::Name(base_font.to_vec())),
        ]);
        font_dict.set(alias, Object::Dictionary(font_entry));
    }
}

fn ensure_font_on_page(doc: &mut Document, page_id: ObjectId, alias: &[u8], base_font: &[u8]) -> Result<(), String> {
    // Determine whether Resources is an indirect reference or inline
    let resources_ref: Option<ObjectId> = {
        let page_dict = doc.get_object(page_id)
            .map_err(|e| format!("get page: {}", e))?
            .as_dict()
            .map_err(|_| "page not a dict".to_string())?;
        match page_dict.get(b"Resources") {
            Ok(Object::Reference(id)) => Some(*id),
            _ => None,
        }
    };

    if let Some(res_id) = resources_ref {
        // Resources is an indirect object — mutate it directly
        let res_dict = doc.get_object_mut(res_id)
            .map_err(|e| format!("get resources: {}", e))?
            .as_dict_mut()
            .map_err(|_| "resources not a dict".to_string())?;

        // Font dict may also be indirect; only handle inline case here
        let font_is_ref = matches!(res_dict.get(b"Font"), Ok(Object::Reference(_)));
        if font_is_ref {
            // Font dict is itself indirect — follow it
            let font_id = match res_dict.get(b"Font") {
                Ok(Object::Reference(id)) => *id,
                _ => unreachable!(),
            };
            let font_dict = doc.get_object_mut(font_id)
                .map_err(|e| format!("get font dict: {}", e))?
                .as_dict_mut()
                .map_err(|_| "font dict not a dict".to_string())?;
            add_font_to_dict(font_dict, alias, base_font);
        } else {
            if res_dict.get(b"Font").is_err() {
                res_dict.set("Font", Object::Dictionary(Dictionary::new()));
            }
            if let Ok(f) = res_dict.get_mut(b"Font") {
                if let Ok(font_dict) = f.as_dict_mut() {
                    add_font_to_dict(font_dict, alias, base_font);
                }
            }
        }
    } else {
        // Resources is inline or missing — create if needed
        {
            let page_dict = doc.get_object_mut(page_id)
                .map_err(|e| format!("get page mut: {}", e))?
                .as_dict_mut()
                .map_err(|_| "page not a dict".to_string())?;
            if page_dict.get(b"Resources").is_err() {
                page_dict.set("Resources", Object::Dictionary(Dictionary::new()));
            }
        }
        let page_dict = doc.get_object_mut(page_id)
            .map_err(|e| format!("{}", e))?
            .as_dict_mut()
            .map_err(|_| "page not a dict".to_string())?;
        if let Ok(res) = page_dict.get_mut(b"Resources") {
            if let Ok(res_dict) = res.as_dict_mut() {
                if res_dict.get(b"Font").is_err() {
                    res_dict.set("Font", Object::Dictionary(Dictionary::new()));
                }
                if let Ok(f) = res_dict.get_mut(b"Font") {
                    if let Ok(font_dict) = f.as_dict_mut() {
                        add_font_to_dict(font_dict, alias, base_font);
                    }
                }
            }
        }
    }

    Ok(())
}

fn ensure_helv_font(doc: &mut Document, page_id: ObjectId) -> Result<(), String> {
    ensure_font_on_page(doc, page_id, b"Helv", b"Helvetica")
}

fn prepend_content_stream(doc: &mut Document, page_id: ObjectId, new_stream_id: ObjectId) -> Result<(), String> {
    let page = doc.get_object(page_id)
        .map_err(|e| format!("{}", e))?
        .as_dict()
        .map_err(|e| format!("{}", e))?
        .clone();

    let new_contents = match page.get(b"Contents") {
        Ok(Object::Reference(id)) => {
            Object::Array(vec![Object::Reference(new_stream_id), Object::Reference(*id)])
        }
        Ok(Object::Array(arr)) => {
            let mut new_arr = vec![Object::Reference(new_stream_id)];
            new_arr.extend(arr.clone());
            Object::Array(new_arr)
        }
        _ => Object::Reference(new_stream_id),
    };

    doc.get_object_mut(page_id)
        .map_err(|e| format!("{}", e))?
        .as_dict_mut()
        .map_err(|e| format!("{}", e))?
        .set("Contents", new_contents);

    Ok(())
}

fn add_freetext_image(
    doc: &mut Document,
    page: usize,
    x: f64, y: f64, width: f64, height: f64,
    image_width: u32, image_height: u32,
    rgb_b64: &str, alpha_b64: &str,
) -> Result<(), String> {
    let page_id = get_page_id(doc, page)?;

    let rgb = general_purpose::STANDARD.decode(rgb_b64)
        .map_err(|e| format!("base64 rgb decode: {}", e))?;
    let alpha = general_purpose::STANDARD.decode(alpha_b64)
        .map_err(|e| format!("base64 alpha decode: {}", e))?;

    // Soft mask (alpha channel as grayscale image)
    let smask_dict = Dictionary::from_iter([
        ("Type", Object::Name(b"XObject".to_vec())),
        ("Subtype", Object::Name(b"Image".to_vec())),
        ("Width", Object::Integer(image_width as i64)),
        ("Height", Object::Integer(image_height as i64)),
        ("ColorSpace", Object::Name(b"DeviceGray".to_vec())),
        ("BitsPerComponent", Object::Integer(8)),
        ("Length", Object::Integer(alpha.len() as i64)),
    ]);
    let smask_id = doc.add_object(Object::Stream(Stream::new(smask_dict, alpha)));

    // RGB image with SMask
    let img_dict = Dictionary::from_iter([
        ("Type", Object::Name(b"XObject".to_vec())),
        ("Subtype", Object::Name(b"Image".to_vec())),
        ("Width", Object::Integer(image_width as i64)),
        ("Height", Object::Integer(image_height as i64)),
        ("ColorSpace", Object::Name(b"DeviceRGB".to_vec())),
        ("BitsPerComponent", Object::Integer(8)),
        ("SMask", Object::Reference(smask_id)),
        ("Length", Object::Integer(rgb.len() as i64)),
    ]);
    let img_id = doc.add_object(Object::Stream(Stream::new(img_dict, rgb)));

    // Pick a unique name for this XObject on the page
    let xobj_name = format!("Im{}", img_id.0);
    ensure_xobject_on_page(doc, page_id, xobj_name.as_bytes(), img_id)?;

    // Content stream: place image at (x, y) with dimensions (width, height) in PDF coords
    let cs = format!(
        "q\n{} 0 0 {} {} {} cm\n/{} Do\nQ",
        width, height, x, y, xobj_name
    );
    let cs_stream = Stream::new(
        Dictionary::from_iter([("Length", Object::Integer(cs.len() as i64))]),
        cs.into_bytes(),
    );
    let cs_id = doc.add_object(Object::Stream(cs_stream));
    prepend_content_stream(doc, page_id, cs_id)
}

fn ensure_xobject_on_page(doc: &mut Document, page_id: ObjectId, name: &[u8], xobj_id: ObjectId) -> Result<(), String> {
    let resources_ref: Option<ObjectId> = {
        let page_dict = doc.get_object(page_id)
            .map_err(|e| format!("{}", e))?
            .as_dict()
            .map_err(|_| "page not dict".to_string())?;
        match page_dict.get(b"Resources") {
            Ok(Object::Reference(id)) => Some(*id),
            _ => None,
        }
    };

    let add_to_res = |res_dict: &mut Dictionary| {
        if res_dict.get(b"XObject").is_err() {
            res_dict.set("XObject", Object::Dictionary(Dictionary::new()));
        }
        if let Ok(xo) = res_dict.get_mut(b"XObject") {
            if let Ok(xo_dict) = xo.as_dict_mut() {
                xo_dict.set(name, Object::Reference(xobj_id));
            }
        }
    };

    if let Some(res_id) = resources_ref {
        let res_dict = doc.get_object_mut(res_id)
            .map_err(|e| format!("{}", e))?
            .as_dict_mut()
            .map_err(|_| "resources not dict".to_string())?;
        add_to_res(res_dict);
    } else {
        {
            let page_dict = doc.get_object_mut(page_id)
                .map_err(|e| format!("{}", e))?
                .as_dict_mut()
                .map_err(|_| "page not dict".to_string())?;
            if page_dict.get(b"Resources").is_err() {
                page_dict.set("Resources", Object::Dictionary(Dictionary::new()));
            }
        }
        let page_dict = doc.get_object_mut(page_id)
            .map_err(|e| format!("{}", e))?
            .as_dict_mut()
            .map_err(|_| "page not dict".to_string())?;
        if let Ok(res) = page_dict.get_mut(b"Resources") {
            if let Ok(res_dict) = res.as_dict_mut() {
                add_to_res(res_dict);
            }
        }
    }
    Ok(())
}

fn push_annot(doc: &mut Document, page_id: ObjectId, annot_id: ObjectId) -> Result<(), String> {
    let page = doc.get_object(page_id)
        .map_err(|e| format!("{}", e))?
        .as_dict()
        .map_err(|e| format!("{}", e))?
        .clone();

    let new_annots = match page.get(b"Annots") {
        Ok(Object::Reference(id)) => {
            let existing = doc.get_object(*id)
                .map_err(|e| format!("{}", e))?
                .as_array()
                .map_err(|e| format!("{}", e))?
                .clone();
            let mut arr = existing;
            arr.push(Object::Reference(annot_id));
            *doc.get_object_mut(*id)
                .map_err(|e| format!("{}", e))? = Object::Array(arr);
            return Ok(());
        }
        Ok(Object::Array(arr)) => {
            let mut new_arr = arr.clone();
            new_arr.push(Object::Reference(annot_id));
            Object::Array(new_arr)
        }
        _ => Object::Array(vec![Object::Reference(annot_id)]),
    };

    doc.get_object_mut(page_id)
        .map_err(|e| format!("{}", e))?
        .as_dict_mut()
        .map_err(|e| format!("{}", e))?
        .set("Annots", new_annots);

    Ok(())
}

fn find_field(doc: &Document, name: &str) -> Option<ObjectId> {
    let acroform = doc.trailer
        .get(b"Root").ok()?
        .as_reference().ok()
        .and_then(|id| doc.get_object(id).ok())?
        .as_dict().ok()?
        .get(b"AcroForm").ok()?
        .as_reference().ok()
        .and_then(|id| doc.get_object(id).ok())?
        .as_dict().ok()?
        .get(b"Fields").ok()?
        .as_array().ok()?
        .clone();

    find_field_in_array(doc, &acroform, name)
}

fn find_field_in_array(doc: &Document, arr: &[Object], name: &str) -> Option<ObjectId> {
    for item in arr {
        let id = item.as_reference().ok()?;
        let dict = doc.get_object(id).ok()?.as_dict().ok()?;

        let t = dict.get(b"T").ok()
            .and_then(|v| v.as_str().ok())
            .map(|s| String::from_utf8_lossy(s).into_owned());

        if t.as_deref() == Some(name) {
            return Some(id);
        }

        if let Ok(kids) = dict.get(b"Kids") {
            if let Ok(kids_arr) = kids.as_array() {
                let kids_clone = kids_arr.clone();
                if let Some(found) = find_field_in_array(doc, &kids_clone, name) {
                    return Some(found);
                }
            }
        }
    }
    None
}

fn set_form_text(doc: &mut Document, field_name: &str, value: &str) -> Result<(), String> {
    let id = find_field(doc, field_name)
        .ok_or_else(|| format!("Field '{}' not found", field_name))?;

    doc.get_object_mut(id)
        .map_err(|e| format!("{}", e))?
        .as_dict_mut()
        .map_err(|e| format!("{}", e))?
        .set("V", Object::String(value.as_bytes().to_vec(), lopdf::StringFormat::Literal));

    Ok(())
}

fn set_form_checkbox(doc: &mut Document, field_name: &str, checked: bool) -> Result<(), String> {
    let id = find_field(doc, field_name)
        .ok_or_else(|| format!("Field '{}' not found", field_name))?;

    let on_name = {
        let dict = doc.get_object(id)
            .map_err(|e| format!("{}", e))?
            .as_dict()
            .map_err(|e| format!("{}", e))?;

        dict.get(b"AP").ok()
            .and_then(|ap| ap.as_dict().ok())
            .and_then(|ap_dict| ap_dict.get(b"N").ok())
            .and_then(|n| n.as_dict().ok())
            .and_then(|n_dict| {
                n_dict.iter()
                    .find(|(k, _)| k.as_slice() != b"Off")
                    .map(|(k, _)| String::from_utf8_lossy(k).into_owned())
            })
            .unwrap_or_else(|| "Yes".to_string())
    };

    let value_name = if checked { on_name.as_bytes().to_vec() } else { b"Off".to_vec() };

    let dict = doc.get_object_mut(id)
        .map_err(|e| format!("{}", e))?
        .as_dict_mut()
        .map_err(|e| format!("{}", e))?;

    dict.set("V", Object::Name(value_name.clone()));
    dict.set("AS", Object::Name(value_name));

    Ok(())
}
