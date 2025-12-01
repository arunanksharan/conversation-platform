import { forwardRef } from 'react';
import {
  Input as AriaInput,
  type InputProps as AriaInputProps,
  type InputRenderProps,
} from 'react-aria-components';
import { cn } from '../lib/cn';
import { inputVariants, type InputVariants } from '../variants/input';

export interface InputProps
  extends Omit<AriaInputProps, 'className' | 'size'>,
    InputVariants {
  className?: string | ((renderProps: InputRenderProps) => string);
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size, className, ...props }, ref) => {
    return (
      <AriaInput
        ref={ref}
        {...props}
        className={(renderProps) =>
          cn(
            inputVariants({ size }),
            renderProps.isFocusVisible && 'ring-2 ring-ring ring-offset-2',
            renderProps.isDisabled && 'opacity-50 cursor-not-allowed',
            typeof className === 'function' ? className(renderProps) : className
          )
        }
      />
    );
  }
);

Input.displayName = 'Input';
