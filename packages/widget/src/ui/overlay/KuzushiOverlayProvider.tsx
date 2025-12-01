import React from 'react';

export interface KuzushiOverlayProviderProps {
  children: React.ReactNode;
  /**
   * Portal container for overlays inside Shadow DOM
   */
  portalContainer?: HTMLElement | null;
}

/**
 * Provider for React Aria overlays with Shadow DOM support
 *
 * Note: React Aria Components v1.13+ handle Shadow DOM automatically.
 * This component exists primarily for future portal configuration if needed.
 */
export const KuzushiOverlayProvider = ({
  children,
}: KuzushiOverlayProviderProps) => {
  // For now, just pass through children
  // Future: can add portal configuration when using Dialog/Modal components
  return <>{children}</>;
};

KuzushiOverlayProvider.displayName = 'KuzushiOverlayProvider';
