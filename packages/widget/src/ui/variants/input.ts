import { cva, type VariantProps } from 'class-variance-authority';

export const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        default: 'h-10 px-3 py-2 text-sm',
        sm: 'h-9 px-2 py-1 text-xs',
        lg: 'h-11 px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export type InputVariants = VariantProps<typeof inputVariants>;
