/**
 * Kuzushi Widget Loader with r2wc
 *
 * This script uses @r2wc/react-to-web-component to convert the React app
 * into a proper Web Component with Shadow DOM.
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
  };
}

/**
 * Fetch session configuration from backend
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
 * Generate a unique instance ID
 */
function generateInstanceId(): string {
  return `widget_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Load and configure the widget
 */
async function loadWidget() {
  try {
    // Dynamically import the widget
    const { WidgetApp } = await import(
      /* @vite-ignore */
      '@kuzushi/widget'
    );

    // Convert React component to Web Component using r2wc
    const KuzushiWidget = r2wc(WidgetApp, {
      shadow: 'open', // Use Shadow DOM
      props: {
        projectId: 'string',
        apiBaseUrl: 'string',
      },
    });

    // Register the custom element
    if (!customElements.get('kuzushi-widget')) {
      customElements.define('kuzushi-widget', KuzushiWidget);
      console.log('[Kuzushi] Widget registered with r2wc');
    }

    // Add initialization logic
    document.addEventListener('DOMContentLoaded', async () => {
      const widgets = document.querySelectorAll('kuzushi-widget');

      widgets.forEach(async (element) => {
        const projectId = element.getAttribute('project-id');
        const apiBaseUrl = element.getAttribute('api-base-url');

        if (!projectId || !apiBaseUrl) {
          console.error('[Kuzushi] Missing required attributes: project-id and api-base-url');
          return;
        }

        try {
          // Initialize session
          const instanceId = generateInstanceId();
          const sessionConfig = await initSession(projectId, apiBaseUrl, instanceId);

          // Pass config to the widget via props
          // r2wc will automatically map these to React props
          element.setAttribute('session-id', sessionConfig.sessionId);
          element.setAttribute('config', JSON.stringify(sessionConfig));

          console.log('[Kuzushi] Widget initialized successfully');
        } catch (error) {
          console.error('[Kuzushi] Failed to initialize widget:', error);
        }
      });
    });
  } catch (error) {
    console.error('[Kuzushi] Failed to load widget:', error);
  }
}

// Load the widget
loadWidget();

export {};
