import { tools } from '@/lib/tools-config';
import { ValidationError } from '@/domain/errors';
import { getApprovedComments } from '@/infra/comment.repo';
import type { PublicComment } from '@/domain/entities';

export async function getComments(slug: string): Promise<PublicComment[]> {
  if (!slug || !tools[slug]) {
    throw new ValidationError('Invalid tool.');
  }
  return getApprovedComments(slug);
}
