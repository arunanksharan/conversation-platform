import { forwardRef } from 'react';
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  type ButtonRenderProps,
} from 'react-aria-components';
import { cn } from '../lib/cn';
import { buttonVariants, type ButtonVariants } from '../variants/button';

export interface ButtonProps
  extends Omit<AriaButtonProps, 'className'>,
    ButtonVariants {
  className?: string | ((renderProps: ButtonRenderProps) => string);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, className, ...props }, ref) => {
    return (
      <AriaButton
        ref={ref}
        {...props}
        className={(renderProps) =>
          cn(
            buttonVariants({ variant, size }),
            renderProps.isPressed && 'scale-95',
            renderProps.isFocusVisible && 'ring-2 ring-ring ring-offset-2',
            renderProps.isDisabled && 'opacity-50 cursor-not-allowed',
            typeof className === 'function' ? className(renderProps) : className
          )
        }
      />
    );
  }
);

Button.displayName = 'Button';
