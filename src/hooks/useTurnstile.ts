import { useEffect, useRef } from 'react';

interface TurnstileWindow {
  turnstile?: {
    render: (el: HTMLElement, opts: Record<string, unknown>) => string;
    reset: (id: string) => void;
  };
}

export function useTurnstile(siteKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderWidget = () => {
      if (widgetIdRef.current !== null) return;
      const w = window as unknown as TurnstileWindow;
      if (!w.turnstile) return;
      widgetIdRef.current = w.turnstile.render(el, {
        sitekey: siteKey,
        theme: 'light',
      });
    };

    if ((window as unknown as TurnstileWindow).turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if ((window as unknown as TurnstileWindow).turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [siteKey]);

  const getToken = (): string | null => {
    const input = containerRef.current?.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]');
    return input?.value || null;
  };

  const reset = () => {
    const w = window as unknown as TurnstileWindow;
    if (w.turnstile && widgetIdRef.current !== null) {
      w.turnstile.reset(widgetIdRef.current);
    }
  };

  return { containerRef, getToken, reset };
}
