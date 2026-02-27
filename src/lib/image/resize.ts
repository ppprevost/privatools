export interface ResizeOptions {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
}

export async function resizeImage(
  data: ArrayBuffer,
  type: string,
  options: ResizeOptions,
  onProgress?: (p: number) => void
): Promise<Blob> {
  onProgress?.(10);

  const blob = new Blob([data], { type });
  const bitmap = await createImageBitmap(blob);
  onProgress?.(30);

  let { width, height } = options;
  if (options.maintainAspectRatio) {
    const ratio = bitmap.width / bitmap.height;
    if (width && !height) {
      height = Math.round(width / ratio);
    } else if (height && !width) {
      width = Math.round(height * ratio);
    } else {
      const scaleW = width / bitmap.width;
      const scaleH = height / bitmap.height;
      const scale = Math.min(scaleW, scaleH);
      width = Math.round(bitmap.width * scale);
      height = Math.round(bitmap.height * scale);
    }
  }

  onProgress?.(50);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  onProgress?.(70);

  const outputType = type === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = outputType === 'image/jpeg' ? 0.92 : undefined;
  const result = await canvas.convertToBlob({ type: outputType, quality });

  onProgress?.(100);
  return result;
}
