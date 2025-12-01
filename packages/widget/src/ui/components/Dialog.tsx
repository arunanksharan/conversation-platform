import {
  Dialog as AriaDialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  type DialogProps as AriaDialogProps,
  type ModalOverlayProps,
  type DialogRenderProps,
  type ModalRenderProps,
} from 'react-aria-components';
import { cn } from '../lib/cn';

export interface DialogProps extends Omit<AriaDialogProps, 'className'> {
  className?: string | ((renderProps: DialogRenderProps) => string);
}

export const Dialog = ({ className, ...props }: DialogProps) => {
  const baseClassName = 'relative flex max-h-[85vh] flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg';
  const finalClassName = typeof className === 'string' ? cn(baseClassName, className) : baseClassName;

  return (
    <AriaDialog
      {...props}
      className={finalClassName}
    />
  );
};

Dialog.displayName = 'Dialog';

export interface DialogOverlayProps extends Omit<ModalOverlayProps, 'className'> {
  className?: string | ((renderProps: ModalRenderProps) => string);
}

export const DialogOverlay = ({ className, ...props }: DialogOverlayProps) => {
  return (
    <ModalOverlay
      {...props}
      className={(renderProps: ModalRenderProps) =>
        cn(
          'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[entering]:animate-in data-[exiting]:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0',
          typeof className === 'function' ? className(renderProps) : className
        )
      }
    >
      <Modal
        {...props}
        className={(renderProps: ModalRenderProps) =>
          cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border p-6 shadow-lg duration-200 data-[entering]:animate-in data-[exiting]:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0 data-[entering]:zoom-in-95 data-[exiting]:zoom-out-95 data-[entering]:slide-in-from-left-1/2 data-[entering]:slide-in-from-top-[48%] data-[exiting]:slide-out-to-left-1/2 data-[exiting]:slide-out-to-top-[48%]',
            typeof className === 'function' ? className(renderProps) : className
          )
        }
      />
    </ModalOverlay>
  );
};

DialogOverlay.displayName = 'DialogOverlay';

export { DialogTrigger };
