import React from 'react';
import { cn } from '../lib/cn';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image URL */
  src?: string;
  /** Alt text for image */
  alt?: string;
  /** Fallback text (typically initials) */
  fallback?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, fallback, size = 'md', className, ...props }, ref) => {
    const [imgError, setImgError] = React.useState(false);

    const sizeClasses = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
    };

    const showImage = src && !imgError;

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted font-medium text-muted-foreground">
            {fallback || '?'}
          </div>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum number of avatars to show before "+N" */
  max?: number;
  children: React.ReactElement<AvatarProps>[];
}

export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ max = 3, children, className, ...props }, ref) => {
    const avatars = React.Children.toArray(children) as React.ReactElement<AvatarProps>[];
    const visible = avatars.slice(0, max);
    const remaining = avatars.length - max;

    return (
      <div
        ref={ref}
        className={cn('flex items-center -space-x-2', className)}
        {...props}
      >
        {visible.map((avatar, index) =>
          React.cloneElement(avatar, {
            key: index,
            className: cn('ring-2 ring-background', avatar.props.className),
          })
        )}
        {remaining > 0 && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground ring-2 ring-background">
            +{remaining}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';
