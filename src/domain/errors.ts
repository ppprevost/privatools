export class ValidationError extends Error {
  override name = 'ValidationError' as const;
}

export class RateLimitError extends Error {
  override name = 'RateLimitError' as const;
  constructor(message = 'Too many requests. Please try again later.') {
    super(message);
  }
}

export class CaptchaError extends Error {
  override name = 'CaptchaError' as const;
  constructor(message = 'Captcha verification failed.') {
    super(message);
  }
}

export class NotFoundError extends Error {
  override name = 'NotFoundError' as const;
}

export class AuthError extends Error {
  override name = 'AuthError' as const;
  constructor(message = 'Unauthorized.') {
    super(message);
  }
}
