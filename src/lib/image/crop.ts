export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropImage(
  data: ArrayBuffer,
  type: string,
  crop: CropArea,
  onProgress?: (p: number) => void
): Promise<Blob> {
  onProgress?.(10);

  const blob = new Blob([data], { type });
  const bitmap = await createImageBitmap(blob);
  onProgress?.(30);

  const canvas = new OffscreenCanvas(crop.width, crop.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    bitmap,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, crop.width, crop.height
  );
  bitmap.close();

  onProgress?.(70);

  const outputType = type === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = outputType === 'image/jpeg' ? 0.92 : undefined;
  const result = await canvas.convertToBlob({ type: outputType, quality });

  onProgress?.(100);
  return result;
}
