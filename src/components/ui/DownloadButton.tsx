import { Download } from 'lucide-react';
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
    <Button variant="secondary" size="lg" onClick={handleDownload}>
      <Download size={20} />
      Download
    </Button>
  );
}
