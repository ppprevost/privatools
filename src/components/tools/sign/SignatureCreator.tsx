import { useState, Suspense } from 'react';
import StatusMessage from '@/components/ui/StatusMessage';
import SignaturePad from './SignaturePad';
import SignatureTyped from './SignatureTyped';
import SignatureUpload from './SignatureUpload';
import { PenLine, Type, Upload } from 'lucide-react';

type TabId = 'draw' | 'type' | 'upload';

type SignatureCreatorProps = {
  mode: 'signature' | 'initials';
  onConfirm: (dataUrl: string) => void;
};

const tabs: { id: TabId; label: string; icon: typeof PenLine }[] = [
  { id: 'draw', label: 'Draw', icon: PenLine },
  { id: 'type', label: 'Type', icon: Type },
  { id: 'upload', label: 'Upload', icon: Upload },
];

export default function SignatureCreator({ mode, onConfirm }: Readonly<SignatureCreatorProps>) {
  const [activeTab, setActiveTab] = useState<TabId>('draw');

  const padSize = mode === 'initials' ? { width: 300, height: 150 } : { width: 600, height: 200 };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-black text-slate-900 tracking-tight text-center">
        {mode === 'initials' ? 'Create your initials' : 'Create your signature'}
      </h3>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm border-[2px] border-slate-900'
                  : 'text-slate-500 hover:text-slate-700 border-[2px] border-transparent'
              }`}
            >
              <Icon size={16} strokeWidth={2.5} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'draw' && <SignaturePad onConfirm={onConfirm} {...padSize} />}
      {activeTab === 'type' && (
        <Suspense fallback={<StatusMessage variant="loading">Loading fonts...</StatusMessage>}>
          <SignatureTyped onConfirm={onConfirm} />
        </Suspense>
      )}
      {activeTab === 'upload' && <SignatureUpload onConfirm={onConfirm} />}
    </div>
  );
}
