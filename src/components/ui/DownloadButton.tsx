import { Download, CheckCircle } from 'lucide-react';
import Button from './Button';

interface DownloadButtonProps {
  blob: Blob;
  filename: string;
}

export default function DownloadButton({ blob, filename }: DownloadButtonProps) {
  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-emerald-600">
        <CheckCircle size={20} />
        <p className="text-sm font-bold">Done! Your file is ready to download.</p>
      </div>
      <Button variant="secondary" size="lg" onClick={handleDownload}>
        <Download size={20} />
        Download
      </Button>
    </div>
  );
}
