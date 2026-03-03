export const COMMENT_LIMITS = {
  name: { min: 3, max: 100 },
  content: { min: 10, max: 2000 },
} as const;

export const CONTACT_LIMITS = {
  name: { max: 200 },
  email: { max: 320 },
  message: { max: 5000 },
} as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // eslint-disable-line sonarjs/slow-regex

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

type ValidationResult = {
  valid: boolean;
  error?: string;
};

export function validateComment(name: string, content: string): ValidationResult {
  const trimmedName = name?.trim() ?? '';
  const trimmedContent = content?.trim() ?? '';

  if (trimmedName.length < COMMENT_LIMITS.name.min || trimmedName.length > COMMENT_LIMITS.name.max) {
    return { valid: false, error: `Name must be between ${COMMENT_LIMITS.name.min} and ${COMMENT_LIMITS.name.max} characters.` };
  }

  if (trimmedContent.length < COMMENT_LIMITS.content.min || trimmedContent.length > COMMENT_LIMITS.content.max) {
    return { valid: false, error: `Comment must be between ${COMMENT_LIMITS.content.min} and ${COMMENT_LIMITS.content.max} characters.` };
  }

  return { valid: true };
}

export function validateContactMessage(name: string, email: string, message: string): ValidationResult {
  const trimmedName = name?.trim() ?? '';
  const trimmedEmail = email?.trim() ?? '';
  const trimmedMessage = message?.trim() ?? '';

  if (!trimmedName || !trimmedEmail || !trimmedMessage) {
    return { valid: false, error: 'All fields are required.' };
  }

  if (trimmedName.length > CONTACT_LIMITS.name.max || trimmedEmail.length > CONTACT_LIMITS.email.max || trimmedMessage.length > CONTACT_LIMITS.message.max) {
    return { valid: false, error: 'Input too long.' };
  }

  if (!isValidEmail(trimmedEmail)) {
    return { valid: false, error: 'Invalid email address.' };
  }

  return { valid: true };
}
