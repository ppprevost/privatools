import { useEffect, useRef, useState, type FormEvent } from 'react';

interface Comment {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
}

interface Props {
  toolSlug: string;
  turnstileSiteKey: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  const intervals: Record<string, number> = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  for (const [unit, value] of Object.entries(intervals)) {
    const count = Math.floor(seconds / value);
    if (count >= 1) return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export default function CommentSection({ toolSlug, turnstileSiteKey }: Readonly<Props>) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  useEffect(() => {
    fetch(`/api/comments/${toolSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setComments(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [toolSlug]);

  useEffect(() => {
    if (!turnstileRef.current) return;

    const renderWidget = () => {
      if (turnstileWidgetId.current !== null) return;
      const w = window as unknown as { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string } };
      if (!w.turnstile) return;
      turnstileWidgetId.current = w.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        theme: 'light',
      });
    };

    if ((window as unknown as { turnstile?: unknown }).turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if ((window as unknown as { turnstile?: unknown }).turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [turnstileSiteKey]);

  const getTurnstileToken = (): string | null => {
    const input = turnstileRef.current?.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]');
    return input?.value || null;
  };

  const resetTurnstile = () => {
    const w = window as unknown as { turnstile?: { reset: (id: string) => void } };
    if (w.turnstile && turnstileWidgetId.current !== null) {
      w.turnstile.reset(turnstileWidgetId.current);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const turnstileToken = getTurnstileToken();
    if (!turnstileToken && !website) {
      setMessage({ type: 'error', text: 'Please complete the captcha.' });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolSlug,
          authorName,
          content,
          turnstileToken,
          website,
        }),
      });

      if (res.status === 201) {
        setMessage({ type: 'success', text: 'Your comment will appear after review.' });
        setAuthorName('');
        setContent('');
        resetTurnstile();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Something went wrong.' });
        resetTurnstile();
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  const renderComments = () => {
    if (loading) {
      return <p className="text-slate-500 text-sm">Loading comments...</p>;
    }
    if (comments.length === 0) {
      return (
        <div className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[var(--shadow-brutalist-sm)] p-6 text-center">
          <p className="text-slate-500">No comments yet. Be the first to share your thoughts!</p>
        </div>
      );
    }
    return (
      <div className="space-y-4 mb-8">
        {comments.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[var(--shadow-brutalist-sm)] p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-slate-900">{c.author_name}</span>
              <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
            </div>
            <p className="text-slate-600 text-sm whitespace-pre-line">{c.content}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Comments</h2>

      {renderComments()}

      <div className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[var(--shadow-brutalist-sm)] p-6 mt-8">
        <h3 className="text-lg font-black text-slate-900 mb-4">Leave a comment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="author-name" className="block text-sm font-bold text-slate-700 mb-1">
              Name
            </label>
            <input
              id="author-name"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
              minLength={3}
              maxLength={100}
              className="w-full px-4 py-2.5 rounded-[var(--radius-button)] border-[3px] border-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="comment-content" className="block text-sm font-bold text-slate-700 mb-1">
              Comment
            </label>
            <textarea
              id="comment-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              className="w-full px-4 py-2.5 rounded-[var(--radius-button)] border-[3px] border-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical"
              placeholder="Share your experience with this tool..."
            />
          </div>

          <div className="absolute opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div ref={turnstileRef} />

          {message && (
            <p
              className={`text-sm font-bold ${message.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 font-bold rounded-[var(--radius-button)] border-[3px] border-slate-900 bg-slate-900 text-white px-6 py-3 text-base shadow-[var(--shadow-brutalist-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-600 active:translate-y-0 active:shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Post Comment'}
          </button>
        </form>
      </div>
    </section>
  );
}
