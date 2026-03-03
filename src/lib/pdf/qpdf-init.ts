import createModule from '@neslinesli93/qpdf-wasm';
import type { QpdfInstance } from '@neslinesli93/qpdf-wasm';

export type QpdfContext = {
  qpdf: QpdfInstance;
  getLastError: () => string;
};

export async function initQpdf(): Promise<QpdfContext> {
  const errorLines: string[] = [];

  const qpdf = await createModule({
    locateFile: () => '/wasm/qpdf.wasm',
    noInitialRun: true,
    printErr: (text: string) => { errorLines.push(text); },
    preRun: [(mod: QpdfInstance) => {
      mod.FS.mkdir('/input');
      mod.FS.mkdir('/output');
    }],
  } as Parameters<typeof createModule>[0]);

  return { qpdf, getLastError: () => errorLines.join('\n') };
}
