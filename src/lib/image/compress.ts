import UPNG from 'upng-js';

export async function compressImage(
  data: ArrayBuffer,
  type: string,
  quality: number = 0.8,
  onProgress?: (p: number) => void
): Promise<Blob> {
  onProgress?.(10);

  if (type === 'image/png') {
    const img = UPNG.decode(data);
    onProgress?.(30);
    const rgba = UPNG.toRGBA8(img);
    onProgress?.(60);
    const colors = Math.max(8, Math.round(quality * 256));
    const result = UPNG.encode(rgba, img.width, img.height, colors);
    onProgress?.(100);
    return new Blob([result], { type: 'image/png' });
  }

  const blob = new Blob([data], { type });
  const bitmap = await createImageBitmap(blob);
  onProgress?.(30);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  onProgress?.(60);

  const result = await canvas.convertToBlob({
    type: 'image/jpeg',
    quality,
  });

  onProgress?.(100);
  return result;
}
