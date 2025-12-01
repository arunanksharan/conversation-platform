import { forwardRef } from 'react';
import {
  TextArea as AriaTextArea,
  type TextAreaProps as AriaTextAreaProps,
} from 'react-aria-components';
import { cn } from '../lib/cn';
import { inputVariants } from '../variants/input';

export interface TextAreaProps extends Omit<AriaTextAreaProps, 'className'> {
  className?: string | ((renderProps: any) => string);
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => {
    return (
      <AriaTextArea
        ref={ref}
        {...props}
        className={(renderProps: any) =>
          cn(
            inputVariants({ size: 'default' }),
            'min-h-[80px] resize-none',
            renderProps.isFocusVisible && 'ring-2 ring-ring ring-offset-2',
            renderProps.isDisabled && 'opacity-50 cursor-not-allowed',
            typeof className === 'function' ? className(renderProps) : className
          )
        }
      />
    );
  }
);

TextArea.displayName = 'TextArea';
