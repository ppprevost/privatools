import { NotFoundError } from '@/domain/errors';
import { getAllComments, setCommentApproval, deleteComment } from '@/infra/comment.repo';
import type { Comment } from '@/domain/entities';

export async function listAllComments(): Promise<Comment[]> {
  return getAllComments();
}

export async function approveComment(id: number, approved: boolean): Promise<Comment> {
  const result = await setCommentApproval(id, approved);
  if (!result) throw new NotFoundError('Comment not found.');
  return result;
}

export async function removeComment(id: number): Promise<void> {
  const deleted = await deleteComment(id);
  if (!deleted) throw new NotFoundError('Comment not found.');
}
