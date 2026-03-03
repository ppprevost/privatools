import { validateContactMessage } from '@/domain/validators';
import { ValidationError, CaptchaError } from '@/domain/errors';
import { verifyTurnstile } from '@/infra/turnstile';
import { insertContact } from '@/infra/contact.repo';

interface SubmitContactInput {
  name: string;
  email: string;
  message: string;
  turnstileToken?: string;
}

export async function submitContact(input: SubmitContactInput): Promise<void> {
  if (!input.turnstileToken || !(await verifyTurnstile(input.turnstileToken))) {
    throw new CaptchaError();
  }

  const validation = validateContactMessage(input.name, input.email, input.message);
  if (!validation.valid) {
    throw new ValidationError(validation.error ?? 'Invalid input.');
  }

  await insertContact(input.name.trim(), input.email.trim(), input.message.trim());
}
