export async function convertToJpg(
  data: ArrayBuffer,
  type: string,
  quality: number = 0.92,
  onProgress?: (p: number) => void
): Promise<Blob> {
  onProgress?.(10);

  const blob = new Blob([data], { type });
  const bitmap = await createImageBitmap(blob);
  onProgress?.(40);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  onProgress?.(70);

  const result = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  onProgress?.(100);
  return result;
}
