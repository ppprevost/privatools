import { neon } from '@neondatabase/serverless';

export function sql() {
  return neon(process.env.DATABASE_URL ?? '');
}
