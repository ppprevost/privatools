import { initQpdf } from './qpdf-init';

export type UnlockOptions = {
  password: string;
};

export async function unlockPdf(
  data: ArrayBuffer,
  options: UnlockOptions,
  onProgress?: (p: number) => void,
): Promise<Uint8Array> {
  onProgress?.(10);

  const { qpdf, getLastError } = await initQpdf();
  onProgress?.(30);

  const inputBlob = new Blob([data]);
  qpdf.FS.mount(qpdf.WORKERFS, { blobs: [{ name: 'input.pdf', data: inputBlob }] }, '/input');
  onProgress?.(50);

  const args = [
    '--password=' + options.password,
    '--decrypt',
    '/input/input.pdf', '/output/output.pdf',
  ];

  onProgress?.(60);
  const exitCode = qpdf.callMain(args);

  if (exitCode !== 0) {
    qpdf.FS.unmount('/input');
    const err = getLastError();
    if (err.includes('invalid password') || err.includes('password')) {
      throw new Error('Incorrect password. Please try again.');
    }
    throw new Error(err || `qpdf exited with code ${exitCode}`);
  }

  onProgress?.(80);
  const result = qpdf.FS.readFile('/output/output.pdf');
  qpdf.FS.unlink('/output/output.pdf');
  qpdf.FS.unmount('/input');
  onProgress?.(100);

  return result;
}
