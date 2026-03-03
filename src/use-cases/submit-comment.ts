import { tools } from '@/lib/tools-config';
import { validateComment } from '@/domain/validators';
import { validationError, captchaError, rateLimitError } from '@/domain/errors';
import { verifyTurnstile } from '@/infra/turnstile';
import { hashIP } from '@/infra/hash';
import { countRecentByIp, insertComment } from '@/infra/comment.repo';

type SubmitCommentInput = {
  toolSlug: string;
  authorName: string;
  content: string;
  turnstileToken?: string;
  website?: string;
  ip: string;
  isMobile: boolean;
};

export async function submitComment(input: SubmitCommentInput): Promise<void> {
  if (input.website) return;

  if (!input.toolSlug || !tools[input.toolSlug]) {
    throw validationError('Invalid tool.');
  }

  const trimmedName = input.authorName?.trim() ?? '';
  const trimmedContent = input.content?.trim() ?? '';

  const validation = validateComment(trimmedName, trimmedContent);
  if (!validation.valid) {
    throw validationError(validation.error ?? 'Invalid input.');
  }

  if (!input.isMobile && (!input.turnstileToken || !(await verifyTurnstile(input.turnstileToken)))) {
    throw captchaError();
  }

  const ipHash = await hashIP(input.ip);

  const recentCount = await countRecentByIp(ipHash);
  if (recentCount >= 3) {
    throw rateLimitError('Too many comments. Please try again later.');
  }

  await insertComment(input.toolSlug, trimmedName, trimmedContent, ipHash);
}
