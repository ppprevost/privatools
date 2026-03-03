import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ToolCard from './ToolCard';
import type { ToolConfig } from '@/lib/tools-config';

const mockTool: ToolConfig = {
  slug: 'compress-pdf',
  name: 'Compress PDF',
  description: 'Reduce the size of your PDF files without losing quality.',
  icon: 'FileDown',
  category: 'pdf',
  acceptedTypes: '.pdf',
  multiple: false,
  actionLabel: 'Compress',
};

describe('ToolCard', () => {
  it('renders tool name', () => {
    render(<ToolCard tool={mockTool} />);
    expect(screen.getByText('Compress PDF')).toBeInTheDocument();
  });

  it('renders tool description', () => {
    render(<ToolCard tool={mockTool} />);
    expect(screen.getByText(mockTool.description)).toBeInTheDocument();
  });

  it('renders link to tool page', () => {
    render(<ToolCard tool={mockTool} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/compress-pdf');
  });

  it('applies pdf category colors', () => {
    render(<ToolCard tool={mockTool} />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('bg-rose-50');
  });

  it('applies image category colors', () => {
    const imageTool: ToolConfig = { ...mockTool, slug: 'compress-image', category: 'image', icon: 'ImageDown' };
    render(<ToolCard tool={imageTool} />);
    const link = screen.getByRole('link');
    expect(link.className).toContain('bg-cyan-50');
  });
});
