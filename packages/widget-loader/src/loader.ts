/**
 * Kuzushi Widget Loader
 *
 * This script defines a custom element <kuzushi-widget> that:
 * 1. Creates a Shadow DOM for style isolation
 * 2. Injects Tailwind CSS styles
 * 3. Calls backend /v1/widget/session/init API
 * 4. Dynamically imports and mounts the React widget
 */

// Import widget styles as string (will be bundled inline)
const widgetStyles = `@tailwind base;@tailwind components;@tailwind utilities;@layer base{:host,.kuzushi-widget-root{--widget-radius:0.5rem;--widget-border:214.3 31.8% 91.4%;--widget-input:214.3 31.8% 91.4%;--widget-ring:222.2 47.4% 11.2%;--widget-bg:0 0% 100%;--widget-fg:222.2 47.4% 11.2%;--widget-primary:222.2 47.4% 11.2%;--widget-primary-fg:210 40% 98%;--widget-secondary:210 40% 96.1%;--widget-secondary-fg:222.2 47.4% 11.2%;--widget-destructive:0 84.2% 60.2%;--widget-destructive-fg:210 40% 98%;--widget-muted:210 40% 96.1%;--widget-muted-fg:215.4 16.3% 46.9%;--widget-accent:210 40% 96.1%;--widget-accent-fg:222.2 47.4% 11.2%;--widget-popover:0 0% 100%;--widget-popover-fg:222.2 47.4% 11.2%;--widget-card:0 0% 100%;--widget-card-fg:222.2 47.4% 11.2%}:host(.dark),.kuzushi-widget-root.dark{--widget-border:217.2 32.6% 17.5%;--widget-input:217.2 32.6% 17.5%;--widget-ring:212.7 26.8% 83.9%;--widget-bg:222.2 84% 4.9%;--widget-fg:210 40% 98%;--widget-primary:210 40% 98%;--widget-primary-fg:222.2 47.4% 11.2%;--widget-secondary:217.2 32.6% 17.5%;--widget-secondary-fg:210 40% 98%;--widget-destructive:0 62.8% 30.6%;--widget-destructive-fg:210 40% 98%;--widget-muted:217.2 32.6% 17.5%;--widget-muted-fg:215 20.2% 65.1%;--widget-accent:217.2 32.6% 17.5%;--widget-accent-fg:210 40% 98%;--widget-popover:222.2 84% 4.9%;--widget-popover-fg:210 40% 98%;--widget-card:222.2 84% 4.9%;--widget-card-fg:210 40% 98%}}@layer base{*{@apply border-border}:host,.kuzushi-widget-root{@apply bg-background text-foreground;font-feature-settings:"rlig" 1,"calt" 1;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}}`;

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

class KuzushiWidgetElement extends HTMLElement {
  private _mounted = false;
  private _shadowRoot: ShadowRoot | null = null;

  connectedCallback() {
    // Create shadow root for style isolation
    if (!this._shadowRoot) {
      this._shadowRoot = this.attachShadow({ mode: 'open' });
    }

    // Inject styles
    this.injectStyles();

    // Render loading skeleton
    this.renderSkeleton();

    // Get attributes
    const projectId = this.getAttribute('project-id');
    const apiBaseUrl = this.getAttribute('api-base-url');

    if (!projectId || !apiBaseUrl) {
      this.renderError('Missing required attributes: project-id and api-base-url');
      return;
    }

    // Initialize session and mount widget
    this.initializeWidget(projectId, apiBaseUrl);
  }

  disconnectedCallback() {
    // Cleanup if needed
    console.log('[Kuzushi] Widget disconnected');
  }

  private injectStyles() {
    if (!this._shadowRoot) return;

    // Try to use Constructable Stylesheets (modern browsers)
    if ('adoptedStyleSheets' in Document.prototype && 'CSSStyleSheet' in window) {
      try {
        const sheet = new CSSStyleSheet();
        (sheet as any).replaceSync(widgetStyles);
        this._shadowRoot.adoptedStyleSheets = [sheet];
        console.log('[Kuzushi] Styles injected via Constructable Stylesheets');
        return;
      } catch (err) {
        console.warn('[Kuzushi] Constructable Stylesheets failed, falling back to style tag');
      }
    }

    // Fallback to style tag
    const styleEl = document.createElement('style');
    styleEl.textContent = widgetStyles;
    this._shadowRoot.appendChild(styleEl);
    console.log('[Kuzushi] Styles injected via <style> tag');
  }

  private renderSkeleton() {
    if (!this._shadowRoot) return;

    const skeleton = document.createElement('div');
    skeleton.className = 'kuzushi-widget-skeleton';
    skeleton.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: hsl(var(--widget-bg));
      color: hsl(var(--widget-fg));
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    skeleton.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 40px; height: 40px; border: 3px solid hsl(var(--widget-muted)); border-top-color: hsl(var(--widget-primary)); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <p style="margin-top: 16px; font-size: 14px; color: hsl(var(--widget-muted-fg));">Loading assistant...</p>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;

    this._shadowRoot.appendChild(skeleton);
  }

  private renderError(message: string) {
    if (!this._shadowRoot) return;

    this._shadowRoot.innerHTML = `
      <div style="
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: hsl(var(--widget-bg));
        color: hsl(var(--widget-destructive));
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 20px;
      ">
        <div style="text-align: center;">
          <p style="font-size: 16px; font-weight: 600;">⚠️ Error</p>
          <p style="font-size: 14px; margin-top: 8px;">${message}</p>
        </div>
      </div>
    `;
  }

  private async initializeWidget(projectId: string, apiBaseUrl: string) {
    try {
      // 1. Call backend session init API
      const sessionData = await this.initSession(projectId, apiBaseUrl);

      // 2. Prepare widget config
      const config = {
        projectId,
        sessionId: sessionData.sessionId,
        wsUrl: sessionData.chat.wsUrl,
        voiceSignalingUrl: sessionData.voice?.signalingUrl,
        rtcConfig: sessionData.voice?.rtcConfig,
        theme: sessionData.theme as any,
        features: sessionData.features,
      };

      // 3. Lazy load and mount the React widget
      await this.lazyMount(config);
    } catch (err) {
      console.error('[Kuzushi] Initialization failed:', err);
      this.renderError(err instanceof Error ? err.message : 'Failed to initialize widget');
    }
  }

  private async initSession(
    projectId: string,
    apiBaseUrl: string
  ): Promise<SessionInitResponse> {
    const url = `${apiBaseUrl}/v1/widget/session/init`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        widgetInstanceId: this.generateInstanceId(),
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

  private async lazyMount(config: any) {
    if (this._mounted) return;

    try {
      // Dynamic import of widget
      // In production, this URL should point to your CDN
      const coreModule = await import(
        /* @vite-ignore */
        '@kuzushi/widget'
      );

      if (!this._shadowRoot) {
        throw new Error('Shadow root not available');
      }

      // Clear skeleton
      this._shadowRoot.innerHTML = '';

      // Re-inject styles (they were cleared)
      this.injectStyles();

      // Mount React app
      coreModule.mount(this._shadowRoot, config);

      this._mounted = true;
      console.log('[Kuzushi] Widget mounted successfully');
    } catch (err) {
      console.error('[Kuzushi] Failed to load widget core:', err);
      throw new Error('Failed to load widget application');
    }
  }

  private generateInstanceId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

// Register custom element
if (!customElements.get('kuzushi-widget')) {
  customElements.define('kuzushi-widget', KuzushiWidgetElement);
  console.log('[Kuzushi] Custom element registered');
}

// Export for programmatic access if needed
export { KuzushiWidgetElement };
