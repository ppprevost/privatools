import { useState, useCallback, useEffect } from 'react';
import DropZone from '@/components/ui/DropZone';
import FileCard from '@/components/ui/FileCard';
import ProgressBar from '@/components/ui/ProgressBar';
import DownloadButton from '@/components/ui/DownloadButton';
import Button from '@/components/ui/Button';
import { useWorker } from '@/hooks/useWorker';
import { fireConfetti } from '@/lib/confetti';
import { detectEncryption } from '@/lib/pdf/detect-encryption';
import StatusMessage from '@/components/ui/StatusMessage';
import AlertBanner from '@/components/ui/AlertBanner';
import { ShieldAlert, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

export default function ProtectPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [alreadyEncrypted, setAlreadyEncrypted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowModify, setAllowModify] = useState(true);
  const [allowExtract, setAllowExtract] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { process: workerProcess, reset: workerReset, ...workerState } = useWorker({
    createWorker: () =>
      new Worker(new URL('../../lib/workers/protect-pdf.worker.ts', import.meta.url), { type: 'module' }),
  });

  const handleFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    workerReset();
    setAlreadyEncrypted(false);
    setValidationError(null);

    const buffer = await f.arrayBuffer();
    const status = await detectEncryption(buffer);
    if (status.isEncrypted) setAlreadyEncrypted(true);
  }, [workerReset]);

  const handleProtect = useCallback(async () => {
    if (!file) return;

    if (!password) {
      setValidationError('Password is required.');
      return;
    }
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }
    setValidationError(null);

    const buffer = await file.arrayBuffer();
    workerProcess(buffer, {
      userPassword: password,
      ownerPassword: ownerPassword || undefined,
      allowPrint,
      allowModify,
      allowExtract,
    }, file.name);
  }, [file, password, confirmPassword, ownerPassword, allowPrint, allowModify, allowExtract, workerProcess]);

  useEffect(() => {
    if (workerState.result) fireConfetti();
  }, [workerState.result]);

  const resultBlob = workerState.result ? new Blob([workerState.result.data], { type: 'application/pdf' }) : null;

  const handleRemove = useCallback(() => {
    setFile(null);
    workerReset();
    setPassword('');
    setConfirmPassword('');
    setOwnerPassword('');
    setAlreadyEncrypted(false);
    setValidationError(null);
  }, [workerReset]);

  return (
    <div className="space-y-6">
      {!file && <DropZone accept=".pdf" onFiles={handleFiles} compact />}

      {file && (
        <>
          <FileCard file={file} onRemove={handleRemove} />

          {alreadyEncrypted && (
            <AlertBanner color="amber" icon={<ShieldAlert size={20} strokeWidth={2.5} className="text-amber-600 shrink-0" />}>
              This PDF is already password-protected. Protecting it again will apply a new password.
            </AlertBanner>
          )}

          {!resultBlob && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 pr-12 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-4 py-3 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                {showAdvanced ? <ChevronUp size={16} strokeWidth={2.5} /> : <ChevronDown size={16} strokeWidth={2.5} />}
                Advanced options
              </button>

              {showAdvanced && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border-[2px] border-slate-200">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Owner password (optional)</label>
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Different from user password"
                      className="w-full px-4 py-3 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-xs text-slate-500">Controls editing permissions. If empty, uses the same password.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-700">Permissions</p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={allowPrint} onChange={(e) => setAllowPrint(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                      <span className="text-sm font-medium text-slate-700">Allow printing</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={allowModify} onChange={(e) => setAllowModify(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                      <span className="text-sm font-medium text-slate-700">Allow modifying</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={allowExtract} onChange={(e) => setAllowExtract(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                      <span className="text-sm font-medium text-slate-700">Allow text/image extraction</span>
                    </label>
                  </div>
                </div>
              )}

              {validationError && (
                <StatusMessage variant="error">{validationError}</StatusMessage>
              )}
            </div>
          )}

          {workerState.isProcessing && (
            <div className="space-y-2">
              <ProgressBar value={workerState.progress} />
              <StatusMessage variant="loading">Encrypting...</StatusMessage>
            </div>
          )}

          {workerState.error && (
            <StatusMessage variant="error">{workerState.error}</StatusMessage>
          )}

          {!workerState.isProcessing && !resultBlob && !workerState.error && (
            <div className="flex justify-center">
              <Button onClick={handleProtect} size="lg">Protect PDF</Button>
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
