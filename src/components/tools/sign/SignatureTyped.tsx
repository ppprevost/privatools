import { useState, useRef, useCallback, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Check } from 'lucide-react';

const FONTS = [
  { name: 'Satisfy', file: '/fonts/Satisfy-Regular.ttf' },
  { name: 'Dancing Script', file: '/fonts/DancingScript-Regular.ttf' },
  { name: 'Pacifico', file: '/fonts/Pacifico-Regular.ttf' },
] as const;

type SignatureTypedProps = {
  onConfirm: (dataUrl: string) => void;
};

const loadFonts = async () => {
  const faces = FONTS.map(
    (f) => new FontFace(f.name, `url(${f.file})`, { style: 'normal', weight: '400' }),
  );
  await Promise.all(faces.map((face) => face.load().then((loaded) => document.fonts.add(loaded))));
};

let fontsLoaded = false;

export default function SignatureTyped({ onConfirm }: Readonly<SignatureTypedProps>) {
  const [text, setText] = useState('');
  const [selectedFont, setSelectedFont] = useState(FONTS[0].name);
  const [ready, setReady] = useState(fontsLoaded);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (fontsLoaded) return;
    loadFonts().then(() => {
      fontsLoaded = true;
      setReady(true);
    });
  }, []);

  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !text.trim()) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontSize = 48;
    ctx.font = `${fontSize}px '${selectedFont}'`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.4;

    const dpr = window.devicePixelRatio || 1;
    const padding = 20;
    canvas.width = (textWidth + padding * 2) * dpr;
    canvas.height = (textHeight + padding * 2) * dpr;
    canvas.style.width = `${textWidth + padding * 2}px`;
    canvas.style.height = `${textHeight + padding * 2}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px '${selectedFont}'`;
    ctx.fillStyle = '#1e293b';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, padding, (textHeight + padding * 2) / 2);
  }, [text, selectedFont]);

  useEffect(() => {
    if (ready) renderPreview();
  }, [ready, renderPreview]);

  const handleConfirm = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !text.trim()) return;
    const dataUrl = canvas.toDataURL('image/png');
    onConfirm(dataUrl);
  }, [text, onConfirm]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your name"
        className="w-full px-4 py-3 rounded-xl border-[3px] border-slate-900 font-medium focus:outline-none focus:border-indigo-500"
      />

      <div className="flex gap-2">
        {FONTS.map((f) => (
          <button
            key={f.name}
            type="button"
            onClick={() => setSelectedFont(f.name)}
            className={`flex-1 px-3 py-2 rounded-xl border-[2px] text-lg transition-all cursor-pointer ${
              selectedFont === f.name
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 hover:border-slate-400'
            }`}
            style={{ fontFamily: `'${f.name}', cursive` }}
          >
            {text || 'Preview'}
          </button>
        ))}
      </div>

      {text.trim() && (
        <div className="flex justify-center p-4 rounded-xl border-[3px] border-slate-900 bg-white">
          <canvas ref={canvasRef} />
        </div>
      )}

      <div className="flex justify-center">
        <Button size="sm" onClick={handleConfirm} disabled={!text.trim()}>
          <Check size={16} />
          Confirm
        </Button>
      </div>
    </div>
  );
}
