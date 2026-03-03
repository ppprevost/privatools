import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileCard from './FileCard';

function createFile(name: string, size: number, type = 'application/pdf'): File {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('FileCard', () => {
  it('displays file name', () => {
    render(<FileCard file={createFile('test.pdf', 1024)} />);
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('displays file size', () => {
    render(<FileCard file={createFile('test.pdf', 1024)} />);
    expect(screen.getByText('1 KB')).toBeInTheDocument();
  });

  it('displays compression percentage when resultSize is provided', () => {
    render(<FileCard file={createFile('test.pdf', 1000)} resultSize={750} />);
    expect(screen.getByText('(-25%)')).toBeInTheDocument();
  });

  it('does not display compression when resultSize is not provided', () => {
    render(<FileCard file={createFile('test.pdf', 1000)} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<FileCard file={createFile('test.pdf', 1024)} onRemove={onRemove} />);

    await user.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('does not render remove button without onRemove', () => {
    render(<FileCard file={createFile('test.pdf', 1024)} />);
    expect(screen.queryByRole('button', { name: 'Remove file' })).not.toBeInTheDocument();
  });
});
