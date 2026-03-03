import { describe, it, expect } from 'vitest';
import {
  buildFaqSchema,
  buildBreadcrumbSchema,
  buildOrganizationSchema,
  buildWebAppSchema,
  buildVideoSchema,
  buildArticleSchema,
} from './schema';

describe('buildFaqSchema', () => {
  it('builds correct FAQ JSON-LD', () => {
    const schema = buildFaqSchema([{ question: 'Q1?', answer: 'A1' }]);
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(1);
    expect(schema.mainEntity[0]['@type']).toBe('Question');
    expect(schema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
  });
});

describe('buildBreadcrumbSchema', () => {
  it('builds breadcrumbs with correct positions', () => {
    const schema = buildBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Tools', url: '/tools' },
    ]);
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[1].position).toBe(2);
  });
});

describe('buildOrganizationSchema', () => {
  it('returns correct organization structure', () => {
    const schema = buildOrganizationSchema();
    expect(schema['@type']).toBe('Organization');
    expect(schema.name).toBe('Priva.TOOLS');
    expect(schema.url).toBe('https://priva.tools');
  });
});

describe('buildWebAppSchema', () => {
  it('builds WebApplication schema for pdf tool', () => {
    const schema = buildWebAppSchema({
      name: 'Compress PDF',
      url: 'https://priva.tools/compress-pdf',
      description: 'Compress PDF files',
      category: 'pdf',
    });
    expect(schema['@type']).toBe('WebApplication');
    expect(schema.applicationSubCategory).toBe('PDF Tools');
    expect(schema.isAccessibleForFree).toBe(true);
    expect(schema.offers['@type']).toBe('Offer');
    expect(schema.publisher['@type']).toBe('Organization');
  });

  it('builds WebApplication schema for image tool', () => {
    const schema = buildWebAppSchema({
      name: 'Resize Image',
      url: 'https://priva.tools/resize-image',
      description: 'Resize images',
      category: 'image',
    });
    expect(schema.applicationSubCategory).toBe('Image Tools');
  });
});

describe('buildVideoSchema', () => {
  it('builds VideoObject schema', () => {
    const schema = buildVideoSchema({
      title: 'Demo',
      description: 'A demo video',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      uploadDate: '2024-01-01',
      duration: 'PT1M30S',
      embedUrl: 'https://youtube.com/embed/abc',
    });
    expect(schema['@type']).toBe('VideoObject');
    expect(schema.name).toBe('Demo');
    expect(schema).not.toHaveProperty('contentUrl');
  });

  it('includes contentUrl when provided', () => {
    const schema = buildVideoSchema({
      title: 'Demo',
      description: 'A demo',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      uploadDate: '2024-01-01',
      duration: 'PT1M',
      embedUrl: 'https://youtube.com/embed/abc',
      contentUrl: 'https://example.com/video.mp4',
    });
    expect(schema.contentUrl).toBe('https://example.com/video.mp4');
  });
});

describe('buildArticleSchema', () => {
  it('builds Article schema with dateModified fallback', () => {
    const schema = buildArticleSchema({
      title: 'Test Article',
      description: 'Desc',
      url: 'https://priva.tools/blog/test',
      datePublished: '2024-01-01',
    });
    expect(schema['@type']).toBe('Article');
    expect(schema.dateModified).toBe('2024-01-01');
  });

  it('uses explicit dateModified when provided', () => {
    const schema = buildArticleSchema({
      title: 'Test',
      description: 'Desc',
      url: 'https://priva.tools/blog/test',
      datePublished: '2024-01-01',
      dateModified: '2024-06-01',
    });
    expect(schema.dateModified).toBe('2024-06-01');
  });
});
