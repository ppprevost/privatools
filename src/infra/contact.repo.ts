import { sql } from './neon';

export async function insertContact(name: string, email: string, message: string): Promise<void> {
  await sql()`
    INSERT INTO contacts (name, email, message)
    VALUES (${name}, ${email}, ${message})
  `;
}
