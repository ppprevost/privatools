import { describe, it, expect } from 'vitest';
import { tools, pdfTools, imageTools, type ToolConfig } from './tools-config';

describe('tools-config', () => {
  it('has 12 tools', () => {
    expect(Object.keys(tools)).toHaveLength(12);
  });

  it('pdfTools has 7 tools', () => {
    expect(pdfTools).toHaveLength(7);
    pdfTools.forEach((t) => expect(t.category).toBe('pdf'));
  });

  it('imageTools has 5 tools', () => {
    expect(imageTools).toHaveLength(5);
    imageTools.forEach((t) => expect(t.category).toBe('image'));
  });

  it('each tool has required fields', () => {
    const requiredKeys: (keyof ToolConfig)[] = ['slug', 'name', 'description', 'icon', 'category', 'acceptedTypes', 'multiple', 'actionLabel'];

    Object.values(tools).forEach((tool) => {
      requiredKeys.forEach((key) => {
        expect(tool).toHaveProperty(key);
      });
      expect(tool.slug).toBeTruthy();
      expect(tool.name).toBeTruthy();
    });
  });

  it('slug matches the key in the record', () => {
    Object.entries(tools).forEach(([key, tool]) => {
      expect(tool.slug).toBe(key);
    });
  });
});
