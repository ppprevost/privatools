import { useState, useCallback } from 'react';
import { useWorker } from './useWorker';

interface UseFileProcessorOptions {
  createWorker: () => Worker;
}

export function useFileProcessor({ createWorker }: UseFileProcessorOptions) {
  const [files, setFiles] = useState<File[]>([]);
  const worker = useWorker({ createWorker });

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    worker.reset();
  }, [worker]);

  const processFiles = useCallback(
    async (options: Record<string, unknown> = {}) => {
      if (files.length === 0) return;

      if (files.length === 1) {
        const buffer = await files[0].arrayBuffer();
        worker.process(buffer, options, files[0].name);
      } else {
        const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
        const combined = new ArrayBuffer(0);
        worker.process(combined, { ...options, files: buffers, names: files.map((f) => f.name) }, files[0].name);
      }
    },
    [files, worker]
  );

  const resultBlob = worker.result
    ? new Blob([worker.result.data])
    : null;

  const resultFilename = worker.result?.filename ?? 'output';

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    processFiles,
    progress: worker.progress,
    isProcessing: worker.isProcessing,
    error: worker.error,
    resultBlob,
    resultFilename,
    reset: () => {
      clearFiles();
      worker.reset();
    },
  };
}
