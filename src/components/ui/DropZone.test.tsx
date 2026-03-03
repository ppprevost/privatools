import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DropZone from './DropZone';

function createFile(name: string, size: number, type = 'application/pdf'): File {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function createDropEvent(files: File[]) {
  return {
    preventDefault: vi.fn(),
    dataTransfer: { files },
  };
}

describe('DropZone', () => {
  it('renders drop zone text', () => {
    render(<DropZone accept=".pdf" onFiles={vi.fn()} />);
    expect(screen.getByText('Drop your files here')).toBeInTheDocument();
  });

  it('renders browse button', () => {
    render(<DropZone accept=".pdf" onFiles={vi.fn()} />);
    expect(screen.getByText('Browse')).toBeInTheDocument();
  });

  it('calls onFiles on valid file drop', () => {
    const onFiles = vi.fn();
    render(<DropZone accept=".pdf" onFiles={onFiles} />);

    const dropZone = screen.getByText('Drop your files here').closest('div[class]')!;
    const file = createFile('test.pdf', 1024);

    fireEvent.drop(dropZone, createDropEvent([file]));
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('shows error for files exceeding 200 MB', () => {
    const onFiles = vi.fn();
    render(<DropZone accept=".pdf" onFiles={onFiles} />);

    const dropZone = screen.getByText('Drop your files here').closest('div[class]')!;
    const bigFile = createFile('huge.pdf', 201 * 1024 * 1024);

    fireEvent.drop(dropZone, createDropEvent([bigFile]));
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByText(/exceeds the 200 MB limit/)).toBeInTheDocument();
  });

  it('passes only first file when multiple is false', () => {
    const onFiles = vi.fn();
    render(<DropZone accept=".pdf" onFiles={onFiles} />);

    const dropZone = screen.getByText('Drop your files here').closest('div[class]')!;
    const file1 = createFile('a.pdf', 100);
    const file2 = createFile('b.pdf', 200);

    fireEvent.drop(dropZone, createDropEvent([file1, file2]));
    expect(onFiles).toHaveBeenCalledWith([file1]);
  });

  it('passes all files when multiple is true', () => {
    const onFiles = vi.fn();
    render(<DropZone accept=".pdf" multiple onFiles={onFiles} />);

    const dropZone = screen.getByText('Drop your files here').closest('div[class]')!;
    const file1 = createFile('a.pdf', 100);
    const file2 = createFile('b.pdf', 200);

    fireEvent.drop(dropZone, createDropEvent([file1, file2]));
    expect(onFiles).toHaveBeenCalledWith([file1, file2]);
  });
});
