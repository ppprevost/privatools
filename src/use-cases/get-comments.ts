import { tools } from '@/lib/tools-config';
import { validationError } from '@/domain/errors';
import { getApprovedComments } from '@/infra/comment.repo';
import type { PublicComment } from '@/domain/entities';

export async function getComments(slug: string): Promise<PublicComment[]> {
  if (!slug || !tools[slug]) {
    throw validationError('Invalid tool.');
  }
  return getApprovedComments(slug);
}
