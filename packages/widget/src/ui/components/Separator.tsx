import React from 'react';
import {
  Separator as AriaSeparator,
  type SeparatorProps as AriaSeparatorProps,
} from 'react-aria-components';
import { cn } from '../lib/cn';

export interface SeparatorProps extends Omit<AriaSeparatorProps, 'className'> {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => {
    return (
      <AriaSeparator
        ref={ref}
        orientation={orientation}
        className={cn(
          'shrink-0 bg-border',
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
          className
        )}
        {...props}
      />
    );
  }
);

Separator.displayName = 'Separator';
