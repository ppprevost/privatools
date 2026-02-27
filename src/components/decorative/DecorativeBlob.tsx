import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DecorativeBlobProps {
  className?: string;
  color: string;
}

export default function DecorativeBlob({ className, color }: DecorativeBlobProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={cn('absolute z-0 filter blur-3xl opacity-40', className)}
      animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path
        fill={color}
        d="M44.7,-76.4C58.3,-69.2,70.1,-57.4,78.2,-43.5C86.3,-29.6,90.7,-14.8,89.1,-0.9C87.5,13,79.9,26,70.8,38.1C61.7,50.2,51.1,61.4,38.5,69.5C25.9,77.6,12.9,82.5,-0.6,83.6C-14.1,84.7,-28.3,82,-41.2,74.1C-54.1,66.2,-65.7,53.2,-73.8,38.7C-81.9,24.2,-86.5,8.2,-85.1,-7.5C-83.7,-23.2,-76.3,-38.6,-65.5,-50.2C-54.7,-61.8,-40.5,-69.6,-26.7,-76.7C-12.9,-83.8,0.5,-90.1,14.7,-88.9C28.9,-87.7,44.7,-76.4,44.7,-76.4Z"
        transform="translate(100 100)"
      />
    </motion.svg>
  );
}
