import { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

type FormState = 'idle' | 'sending' | 'success' | 'error';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState('error');
        setErrorMsg(data.error || 'Something went wrong.');
        return;
      }

      setState('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setState('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  if (state === 'success') {
    return (
      <div className="bg-emerald-50 border-[3px] border-emerald-400 rounded-[var(--radius-card)] p-8 text-center shadow-[var(--shadow-brutalist-md)]">
        <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-900 mb-2">Message sent!</h2>
        <p className="text-slate-600 font-medium mb-6">Thanks for reaching out. I'll get back to you soon.</p>
        <Button variant="outline" onClick={() => setState('idle')}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-black text-slate-900 mb-2 uppercase tracking-wider">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-3 rounded-[var(--radius-button)] border-[3px] border-slate-900 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:shadow-[var(--shadow-brutalist-sm)] transition-all"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-black text-slate-900 mb-2 uppercase tracking-wider">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-3 rounded-[var(--radius-button)] border-[3px] border-slate-900 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:shadow-[var(--shadow-brutalist-sm)] transition-all"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-black text-slate-900 mb-2 uppercase tracking-wider">
          Message
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          className="w-full px-4 py-3 rounded-[var(--radius-button)] border-[3px] border-slate-900 bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:shadow-[var(--shadow-brutalist-sm)] transition-all resize-none"
        />
      </div>

      {state === 'error' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-button)] bg-rose-50 border-[3px] border-rose-400 text-rose-700 font-medium">
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={state === 'sending'}>
        {state === 'sending' ? (
          'Sending...'
        ) : (
          <>
            <Send size={18} />
            Send message
          </>
        )}
      </Button>
    </form>
  );
}
