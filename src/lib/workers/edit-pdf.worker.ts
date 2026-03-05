import { initEditPdf, apply_edits, get_form_fields } from '../pdf/edit-init';

self.onmessage = async (e: MessageEvent) => {
  const { action, data, options, filename } = e.data as {
    action: 'get_form_fields' | 'apply_edits';
    data: ArrayBuffer;
    options: { editsJson?: string };
    filename?: string;
  };

  try {
    await initEditPdf();
    const bytes = new Uint8Array(data);

    if (action === 'get_form_fields') {
      const result = get_form_fields(bytes);
      self.postMessage({ type: 'result', result });
      return;
    }

    self.postMessage({ type: 'progress', progress: 10 });
    const out = apply_edits(bytes, options.editsJson ?? '[]');
    self.postMessage({ type: 'progress', progress: 90 });
    self.postMessage(
      {
        type: 'result',
        result: out.buffer,
        filename: filename ?? 'document_edit.pdf',
      },
      [out.buffer],
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', error: message });
  }
};
