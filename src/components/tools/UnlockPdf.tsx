import { useState, useCallback, useEffect } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import { useWorker } from '@/hooks/useWorker';
import { fireConfetti } from '@/lib/confetti';
import { detectEncryption } from '@/lib/pdf/detect-encryption';
import { CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';

export default function UnlockPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [isEncrypted, setIsEncrypted] = useState<boolean | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { process: workerProcess, reset: workerReset, ...workerState } = useWorker({
    createWorker: () =>
      new Worker(new URL('../../lib/workers/unlock-pdf.worker.ts', import.meta.url), { type: 'module' }),
  });

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    workerReset();
    setIsEncrypted(null);
    setPassword('');
    setDetecting(true);

    const buffer = await f.arrayBuffer();
    const status = await detectEncryption(buffer);
    setIsEncrypted(status.isEncrypted);
    setDetecting(false);
  }, [workerReset]);

  const handleUnlock = useCallback(async () => {
    if (!file || !password) return;

    const buffer = await file.arrayBuffer();
    workerProcess(buffer, { password }, file.name);
  }, [file, password, workerProcess]);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    if (workerState.error) workerReset();
  }, [workerState.error, workerReset]);

  useEffect(() => {
    if (workerState.result) fireConfetti();
  }, [workerState.result]);

  const resultBlob = workerState.result ? new Blob([workerState.result.data], { type: 'application/pdf' }) : null;

  const handleRemove = useCallback(() => {
    setFile(null);
    workerReset();
    setIsEncrypted(null);
    setPassword('');
  }, [workerReset]);

  return (
    <div className="space-y-6">
      {!file && <DropZone accept=".pdf" onFiles={handleFiles} compact />}

      {file && (
        <>
          <FileCard file={file} onRemove={handleRemove} />

          {detecting && (
            <p className="text-sm text-slate-500 text-center font-medium">Checking encryption...</p>
          )}

          {isEncrypted === false && !resultBlob && (
            <div className="flex items-center justify-center gap-3 px-4 py-3 bg-emerald-50 rounded-xl border-[3px] border-emerald-400">
              <CheckCircle size={20} className="text-emerald-600 shrink-0" />
              <p className="text-sm font-bold text-emerald-800">This PDF is not password-protected.</p>
            </div>
          )}

          {isEncrypted === true && !resultBlob && (
            <>
              <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 rounded-xl border-[3px] border-rose-400">
                <Lock size={20} className="text-rose-600 shrink-0" />
                <p className="text-sm font-bold text-rose-800">This PDF is password-protected. Enter the password to unlock it.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Enter PDF password"
                    className="w-full px-4 py-3 pr-12 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {workerState.isProcessing && (
            <div className="space-y-2">
              <ProgressBar value={workerState.progress} />
              <p className="text-sm text-slate-500 text-center font-medium">Decrypting...</p>
            </div>
          )}

          {workerState.error && (
            <p className="text-sm text-rose-600 font-bold text-center">{workerState.error}</p>
          )}

          {isEncrypted === true && !workerState.isProcessing && !resultBlob && !workerState.error && (
            <div className="flex justify-center">
              <Button onClick={handleUnlock} size="lg" disabled={!password}>Unlock PDF</Button>
            </div>
          )}

          {resultBlob && (
            <div className="flex justify-center">
              <DownloadButton blob={resultBlob} filename={workerState.result?.filename ?? ''} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
