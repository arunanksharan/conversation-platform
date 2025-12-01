import React from 'react';
import { cn } from '../lib/cn';
import { badgeVariants, type BadgeVariants } from '../variants/badge';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    BadgeVariants {}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ variant, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
