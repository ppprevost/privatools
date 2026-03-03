function createError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

export const validationError = (message: string) => createError('ValidationError', message);

export const rateLimitError = (message = 'Too many requests. Please try again later.') =>
  createError('RateLimitError', message);

export const captchaError = (message = 'Captcha verification failed.') =>
  createError('CaptchaError', message);

export const notFoundError = (message: string) => createError('NotFoundError', message);

export const authError = (message = 'Unauthorized.') => createError('AuthError', message);
