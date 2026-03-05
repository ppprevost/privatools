import init, { apply_edits, get_form_fields } from '@pdf-editor/pdf_editor.js';
import wasmUrl from '@pdf-editor/pdf_editor_bg.wasm?url';

export { apply_edits, get_form_fields };

let ready: Promise<void> | null = null;

export const initEditPdf = (): Promise<void> => {
  if (!ready) {
    ready = init(wasmUrl).catch((err: Error) => {
      ready = null;
      return Promise.reject(err);
    });
  }
  return ready;
};
