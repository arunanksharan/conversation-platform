import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
import type { WidgetConfig } from './types';

let root: Root | null = null;

/**
 * Mount the widget React app into a Shadow DOM root
 */
export function mount(shadowRoot: ShadowRoot, config: WidgetConfig): void {
  if (!shadowRoot) {
    throw new Error('shadowRoot is required');
  }

  if (!config.projectId || !config.sessionId || !config.wsUrl) {
    throw new Error('config.projectId, config.sessionId, and config.wsUrl are required');
  }

  // Create a container div inside shadow root
  let container = shadowRoot.querySelector('.kuzushi-widget-container') as HTMLDivElement;

  if (!container) {
    container = document.createElement('div');
    container.className = 'kuzushi-widget-container';
    container.style.width = '100%';
    container.style.height = '100%';
    shadowRoot.appendChild(container);
  }

  // Create React root and render
  root = createRoot(container);
  root.render(<App config={config} />);

  console.log('[Kuzushi Widget] Mounted with config:', {
    projectId: config.projectId,
    sessionId: config.sessionId,
    features: config.features,
  });
}

/**
 * Unmount the widget and clean up
 */
export function unmount(): void {
  if (root) {
    root.unmount();
    root = null;
    console.log('[Kuzushi Widget] Unmounted');
  }
}

// Export the main widget component for r2wc
export { WidgetApp, type WidgetAppProps } from './App';

// Export types for consumers
export type { WidgetConfig } from './types';
