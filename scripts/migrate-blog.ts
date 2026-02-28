import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const blogDir = join(import.meta.dirname, '..', 'src', 'content', 'blog');

function randomDate(): string {
  const start = new Date('2025-11-01').getTime();
  const end = new Date('2026-02-27').getTime();
  const d = new Date(start + Math.random() * (end - start));
  return d.toISOString().split('T')[0];
}

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Invalid frontmatter');

  const fm = match[1];
  const content = match[2].trim();

  const get = (key: string): string => {
    const m = fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?`, 'm'));
    return m ? m[1].trim() : '';
  };

  let relatedTools: string[] = [];
  const inlineMatch = fm.match(/relatedTools:\s*\[([^\]]*)\]/);
  if (inlineMatch) {
    relatedTools = inlineMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  } else {
    const lines = fm.split('\n');
    let collecting = false;
    for (const line of lines) {
      if (line.match(/^relatedTools:/)) {
        collecting = true;
        continue;
      }
      if (collecting) {
        const item = line.match(/^\s+-\s+(.+)/);
        if (item) {
          relatedTools.push(item[1].trim());
        } else {
          collecting = false;
        }
      }
    }
  }

  return {
    title: get('title'),
    description: get('description'),
    category: get('category'),
    ogImage: get('ogImage') || null,
    relatedTools,
    content,
  };
}

const files = readdirSync(blogDir).filter((f) => f.endsWith('.md'));
console.log(`Found ${files.length} blog posts to migrate`);

for (const file of files) {
  const slug = basename(file, '.md');
  const raw = readFileSync(join(blogDir, file), 'utf-8');
  const { title, description, category, ogImage, relatedTools, content } = parseFrontmatter(raw);
  const date = randomDate();

  await sql`
    INSERT INTO blog_posts (slug, title, description, content, date, category, related_tools, og_image)
    VALUES (${slug}, ${title}, ${description}, ${content}, ${date}, ${category}, ${relatedTools}, ${ogImage})
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      content = EXCLUDED.content,
      date = EXCLUDED.date,
      category = EXCLUDED.category,
      related_tools = EXCLUDED.related_tools,
      og_image = EXCLUDED.og_image
  `;
  console.log(`  ✓ ${slug} (${date})`);
}

console.log('Migration complete');
