import { cva, type VariantProps } from 'class-variance-authority';

export const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm',
  {
    variants: {
      padding: {
        none: '',
        default: 'p-6',
        sm: 'p-4',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      padding: 'default',
    },
  }
);

export type CardVariants = VariantProps<typeof cardVariants>;
