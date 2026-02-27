export async function compressImage(
  data: ArrayBuffer,
  type: string,
  quality: number = 0.8,
  onProgress?: (p: number) => void
): Promise<Blob> {
  onProgress?.(10);

  const blob = new Blob([data], { type });
  const bitmap = await createImageBitmap(blob);
  onProgress?.(30);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  onProgress?.(60);

  const outputType = type === 'image/png' ? 'image/png' : 'image/jpeg';
  const result = await canvas.convertToBlob({
    type: outputType,
    quality: outputType === 'image/jpeg' ? quality : undefined,
  });

  onProgress?.(100);
  return result;
}
