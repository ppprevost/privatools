import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const response = await next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' blob: https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "connect-src 'self' https://cdn.jsdelivr.net https://unpkg.com",
      "img-src 'self' blob: data:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  return response;
});
