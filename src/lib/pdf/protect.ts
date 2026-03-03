import { initQpdf } from './qpdf-init';

export type ProtectOptions = {
  userPassword: string;
  ownerPassword?: string;
  allowPrint?: boolean;
  allowModify?: boolean;
  allowExtract?: boolean;
};

export async function protectPdf(
  data: ArrayBuffer,
  options: ProtectOptions,
  onProgress?: (p: number) => void,
): Promise<Uint8Array> {
  onProgress?.(10);

  const { qpdf, getLastError } = await initQpdf();
  onProgress?.(30);

  const inputBlob = new Blob([data]);
  qpdf.FS.mount(qpdf.WORKERFS, { blobs: [{ name: 'input.pdf', data: inputBlob }] }, '/input');
  onProgress?.(50);

  const owner = options.ownerPassword ?? options.userPassword;
  const args = [
    '--encrypt', options.userPassword, owner, '256',
    ...(options.allowPrint === false ? ['--print=none'] : []),
    ...(options.allowModify === false ? ['--modify=none'] : []),
    ...(options.allowExtract === false ? ['--extract=n'] : []),
    '--',
    '/input/input.pdf', '/output/output.pdf',
  ];

  onProgress?.(60);
  const exitCode = qpdf.callMain(args);

  if (exitCode !== 0) {
    qpdf.FS.unmount('/input');
    throw new Error(getLastError() || `qpdf exited with code ${exitCode}`);
  }

  onProgress?.(80);
  const result = qpdf.FS.readFile('/output/output.pdf');
  qpdf.FS.unlink('/output/output.pdf');
  qpdf.FS.unmount('/input');
  onProgress?.(100);

  return result;
}
