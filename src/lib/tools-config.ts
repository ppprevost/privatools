export type ToolCategory = 'pdf' | 'image';

export interface ToolConfig {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: ToolCategory;
  acceptedTypes: string;
  multiple: boolean;
  actionLabel: string;
}

export const tools: Record<string, ToolConfig> = {
  'compress-pdf': {
    slug: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce the size of your PDF files without losing quality.',
    icon: 'FileDown',
    category: 'pdf',
    acceptedTypes: '.pdf',
    multiple: false,
    actionLabel: 'Compress',
  },
  'merge-pdf': {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into a single document.',
    icon: 'Combine',
    category: 'pdf',
    acceptedTypes: '.pdf',
    multiple: true,
    actionLabel: 'Merge',
  },
  'split-pdf': {
    slug: 'split-pdf',
    name: 'Split PDF',
    description: 'Extract pages from a PDF into separate files.',
    icon: 'Scissors',
    category: 'pdf',
    acceptedTypes: '.pdf',
    multiple: false,
    actionLabel: 'Split',
  },
  'jpg-to-pdf': {
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    description: 'Convert your JPG images into a PDF document.',
    icon: 'FileImage',
    category: 'pdf',
    acceptedTypes: '.jpg,.jpeg,.png,.webp',
    multiple: true,
    actionLabel: 'Convert',
  },
  'compress-image': {
    slug: 'compress-image',
    name: 'Compress Image',
    description: 'Reduce image file size while preserving visual quality.',
    icon: 'ImageDown',
    category: 'image',
    acceptedTypes: '.jpg,.jpeg,.png,.webp',
    multiple: false,
    actionLabel: 'Compress',
  },
  'resize-image': {
    slug: 'resize-image',
    name: 'Resize Image',
    description: 'Change the dimensions of your images instantly.',
    icon: 'Scaling',
    category: 'image',
    acceptedTypes: '.jpg,.jpeg,.png,.webp',
    multiple: false,
    actionLabel: 'Resize',
  },
  'convert-to-jpg': {
    slug: 'convert-to-jpg',
    name: 'Convert to JPG',
    description: 'Convert PNG, WebP, or HEIC images to JPG format.',
    icon: 'FileType',
    category: 'image',
    acceptedTypes: '.png,.webp,.heic,.heif,.bmp,.gif',
    multiple: false,
    actionLabel: 'Convert',
  },
  'crop-image': {
    slug: 'crop-image',
    name: 'Crop Image',
    description: 'Crop your images to the perfect dimensions.',
    icon: 'Crop',
    category: 'image',
    acceptedTypes: '.jpg,.jpeg,.png,.webp',
    multiple: false,
    actionLabel: 'Crop',
  },
  'remove-background': {
    slug: 'remove-background',
    name: 'Remove Background',
    description: 'Automatically remove the background from any image.',
    icon: 'Eraser',
    category: 'image',
    acceptedTypes: '.jpg,.jpeg,.png,.webp',
    multiple: false,
    actionLabel: 'Remove BG',
  },
};

export const pdfTools = Object.values(tools).filter((t) => t.category === 'pdf');
export const imageTools = Object.values(tools).filter((t) => t.category === 'image');
