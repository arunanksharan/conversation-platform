/**
 * Kuzushi Widget Loader (Main Bundle)
 *
 * This loads AFTER snippet.ts and:
 * 1. Processes queued commands from snippet
 * 2. Initializes session with backend
 * 3. Loads React widget
 * 4. Mounts into Shadow DOM
 *
 * Size target: < 50KB gzipped (without React widget)
 */

import r2wc from '@r2wc/react-to-web-component';

interface SessionInitResponse {
  sessionId: string;
  configVersion: number;
  features: {
    textChat?: boolean;
    voice?: boolean;
  };
  theme?: Record<string, unknown>;
  chat: {
    wsUrl: string;
  };
  voice?: {
    enabled: boolean;
    signalingUrl: string;
    rtcConfig?: RTCConfiguration;
  };
  uiHints?: {
    welcomeMessage?: string;
    widgetTitle?: string;
    [key: string]: unknown;
  };
}

/**
 * Initialize session with backend
 */
async function initSession(
  projectId: string,
  apiBaseUrl: string,
  widgetInstanceId: string
): Promise<SessionInitResponse> {
  const url = `${apiBaseUrl}/v1/widget/session/init`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      widgetInstanceId,
      pageUrl: window.location.href,
      hostOrigin: window.location.origin,
      userAgent: navigator.userAgent,
      locale: navigator.language,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Session init failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate unique instance ID
 */
function generateInstanceId(): string {
  return `widget_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Process queued commands from snippet
 */
function processQueue(api: any, widget: any) {
  if (!api.q || !Array.isArray(api.q)) return;

  api.q.forEach((cmd: { method: string; args: unknown[] }) => {
    const method = cmd.method;
    if (typeof (widget as any)[method] === 'function') {
      (widget as any)[method](...cmd.args);
    } else {
      console.warn(`[Kuzushi] Unknown command: ${method}`);
    }
  });

  // Clear queue
  api.q = [];
}

/**
 * Load and initialize the widget
 */
async function loadWidget() {
  try {
    // Get API stub from snippet
    const api = window.Kuzushi;
    if (!api || !api.config) {
      console.error('[Kuzushi] API not initialized');
      return;
    }

    const config = api.config;

    // Initialize session with backend
    const instanceId = generateInstanceId();
    console.log('[Kuzushi] Initializing session...');
    const sessionConfig = await initSession(config.projectId, config.apiBaseUrl, instanceId);
    console.log('[Kuzushi] Session initialized:', sessionConfig.sessionId);

    // Dynamically import the React widget
    console.log('[Kuzushi] Loading widget component...');
    const { WidgetApp } = await import(
      /* @vite-ignore */
      '@kuzushi/widget'
    );

    // Convert React component to Web Component using r2wc
    const KuzushiWidget = r2wc(WidgetApp, {
      shadow: 'open',
      props: {
        projectId: 'string',
        apiBaseUrl: 'string',
        sessionId: 'string',
        config: 'string',
      },
    });

    // Register custom element
    if (!customElements.get('kuzushi-widget')) {
      customElements.define('kuzushi-widget', KuzushiWidget);
      console.log('[Kuzushi] Custom element registered');
    }

    // Create widget element
    const widgetElement = document.createElement('kuzushi-widget');
    widgetElement.setAttribute('project-id', config.projectId);
    widgetElement.setAttribute('api-base-url', config.apiBaseUrl);
    widgetElement.setAttribute('session-id', sessionConfig.sessionId);
    widgetElement.setAttribute('config', JSON.stringify(sessionConfig));

    // Apply styles
    Object.assign(widgetElement.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      height: '600px',
      zIndex: '999999',
      border: 'none',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      overflow: 'hidden',
    });

    // Mount widget
    const container = config.container || document.body;
    container.appendChild(widgetElement);

    // Create widget API
    const widgetAPI = {
      show: () => {
        widgetElement.style.display = 'block';
      },
      hide: () => {
        widgetElement.style.display = 'none';
      },
      destroy: () => {
        widgetElement.remove();
      },
    };

    // Extend global API with widget methods
    Object.assign(api, widgetAPI);

    // Process queued commands
    processQueue(api, widgetAPI);

    // Mark as loaded
    api._loaded = true;

    console.log('[Kuzushi] Widget loaded successfully');
  } catch (error) {
    console.error('[Kuzushi] Failed to load widget:', error);
  }
}

// Auto-load widget when script executes
loadWidget();

export {};
