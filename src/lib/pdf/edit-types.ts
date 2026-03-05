export type EditOp =
  | { type: 'freetext'; page: number; x: number; y: number; width: number; height: number; text: string; fontSize: number; color: [number, number, number]; font?: string; italic?: boolean }
  | { type: 'highlight'; page: number; quadPoints: number[]; color: [number, number, number] }
  | { type: 'text_overlay'; page: number; coverRect: [number, number, number, number]; text: string; fontSize: number; x: number; y: number }
  | { type: 'form_text'; fieldName: string; value: string }
  | { type: 'form_checkbox'; fieldName: string; checked: boolean }
  | { type: 'freetext_image'; page: number; x: number; y: number; width: number; height: number; imageWidth: number; imageHeight: number; rgbB64: string; alphaB64: string };

export type ActiveTool = 'cursor' | 'scroll' | 'text-box' | 'highlight' | 'edit-text' | 'form';

export type FormField = { name: string; field_type: 'text' | 'checkbox' | 'radio' | 'select'; value: string };
