import { useState, useRef, useCallback, useEffect } from 'react';

export interface WorkerMessage {
  type: 'progress' | 'result' | 'error';
  progress?: number;
  result?: ArrayBuffer;
  filename?: string;
  error?: string;
}

interface UseWorkerOptions {
  createWorker: () => Worker;
}

export function useWorker({ createWorker }: UseWorkerOptions) {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ data: ArrayBuffer; filename: string } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const reset = useCallback(() => {
    setProgress(0);
    setIsProcessing(false);
    setError(null);
    setResult(null);
  }, []);

  const process = useCallback(
    (data: ArrayBuffer, options: Record<string, unknown> = {}, filename = 'output') => {
      reset();
      setIsProcessing(true);

      const worker = createWorker();
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          setProgress(msg.progress ?? 0);
        } else if (msg.type === 'result') {
          setResult({ data: msg.result!, filename: msg.filename ?? filename });
          setIsProcessing(false);
          setProgress(100);
          worker.terminate();
        } else if (msg.type === 'error') {
          setError(msg.error ?? 'Unknown error');
          setIsProcessing(false);
          worker.terminate();
        }
      };

      worker.onerror = (e) => {
        setError(e.message);
        setIsProcessing(false);
        worker.terminate();
      };

      worker.postMessage({ data, options, filename }, [data]);
    },
    [createWorker, reset]
  );

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return { process, progress, isProcessing, error, result, reset };
}
