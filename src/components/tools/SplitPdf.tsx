import { useState, useCallback, useEffect } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import Button from '@/components/ui/Button';
import { Download } from 'lucide-react';
import { fireConfetti } from '@/lib/confetti';

interface SplitResult {
  filename: string;
  data: ArrayBuffer;
}

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pageRanges, setPageRanges] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    setFile(files[0]);
    setResults([]);
    setError(null);
  }, []);

  const handleSplit = useCallback(async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    const worker = new Worker(
      new URL('../../lib/workers/split-pdf.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        setProgress(msg.progress);
      } else if (msg.type === 'result') {
        setResults(msg.result);
        setIsProcessing(false);
        setProgress(100);
        fireConfetti();
        worker.terminate();
      } else if (msg.type === 'error') {
        setError(msg.error);
        setIsProcessing(false);
        worker.terminate();
      }
    };

    const buffer = await file.arrayBuffer();
    worker.postMessage({ data: buffer, options: { pageRanges }, filename: file.name }, [buffer]);
  }, [file, pageRanges]);

  const downloadResult = (result: SplitResult) => {
    const blob = new Blob([result.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {!file && <DropZone accept=".pdf" onFiles={handleFiles} compact />}

      {file && (
        <>
          <FileCard file={file} onRemove={() => { setFile(null); setResults([]); }} />

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Page ranges (e.g. 1-3, 5, 8-10)</label>
            <input
              type="text"
              value={pageRanges}
              onChange={(e) => setPageRanges(e.target.value)}
              placeholder="Leave empty to split all pages"
              className="w-full px-4 py-3 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <ProgressBar value={progress} />
              <p className="text-sm text-slate-500 text-center font-medium">Splitting...</p>
            </div>
          )}

          {error && <p className="text-sm text-rose-600 font-bold text-center">{error}</p>}

          {!isProcessing && results.length === 0 && (
            <div className="flex justify-center">
              <Button onClick={handleSplit} size="lg">Split PDF</Button>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-700">{results.length} files created:</p>
              {results.map((result, i) => (
                <button
                  key={i}
                  onClick={() => downloadResult(result)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-white rounded-xl border-[3px] border-slate-900 shadow-[var(--shadow-brutalist-sm)] hover:-translate-y-0.5 transition-all"
                >
                  <span className="font-bold text-slate-900">{result.filename}</span>
                  <Download size={18} className="text-indigo-500" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
