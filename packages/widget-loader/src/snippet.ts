/**
 * Kuzushi Widget Loader Snippet
 *
 * This is the MINIMAL loader that embeds in host pages.
 * Target size: < 2KB minified+gzipped
 *
 * Pattern: Command Queue + Async Load (Segment/Intercom style)
 */

interface KuzushiConfig {
  projectId: string;
  apiBaseUrl: string;
  container?: HTMLElement;
  [key: string]: unknown;
}

interface KuzushiCommand {
  method: string;
  args: unknown[];
}

interface KuzushiAPI {
  (...args: unknown[]): void;
  q?: KuzushiCommand[];
  l?: number;
  config?: KuzushiConfig;
  _loaded?: boolean;
  init?(config: KuzushiConfig): void;
  show?(): void;
  hide?(): void;
  destroy?(): void;
}

declare global {
  interface Window {
    Kuzushi: KuzushiAPI;
    KuzushiConfig?: KuzushiConfig;
  }
}

/**
 * Initialize Kuzushi widget loader
 *
 * Usage:
 * ```html
 * <script>
 *   window.KuzushiConfig = {
 *     projectId: 'your-project-id',
 *     apiBaseUrl: 'https://api.yoursite.com'
 *   };
 * </script>
 * <script src="https://cdn.kuzushi.ai/widget/v1/snippet.js" async></script>
 * ```
 */
(function () {
  // Prevent double initialization
  if (window.Kuzushi && window.Kuzushi._loaded) {
    console.warn('[Kuzushi] Already initialized');
    return;
  }

  // Create API stub with command queue
  const api: KuzushiAPI = function (...args: unknown[]) {
    // Buffer commands until widget loads
    if (!api._loaded) {
      api.q = api.q || [];
      api.q.push({
        method: args[0] as string,
        args: Array.from(args).slice(1),
      });
    }
  };

  // Initialize queue and timestamp
  api.q = [];
  api.l = Date.now();
  api._loaded = false;

  // Expose global API
  window.Kuzushi = api;

  // Get configuration
  const config = window.KuzushiConfig;
  if (!config) {
    console.error('[Kuzushi] Missing KuzushiConfig. Please define window.KuzushiConfig before loading snippet.');
    return;
  }

  if (!config.projectId || !config.apiBaseUrl) {
    console.error('[Kuzushi] Invalid config. projectId and apiBaseUrl are required.');
    return;
  }

  // Store config
  api.config = config;

  // Load main widget script asynchronously
  const script = document.createElement('script');
  script.src = `${config.apiBaseUrl}/widget/loader.js`; // Or use CDN
  script.async = true;
  script.onerror = () => {
    console.error('[Kuzushi] Failed to load widget script');
  };

  // Inject script
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }

  console.log('[Kuzushi] Snippet loaded, widget loading...');
})();

export {};
