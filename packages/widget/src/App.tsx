import { useEffect, useState } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { KuzushiOverlayProvider } from './ui/overlay/KuzushiOverlayProvider';
import { VoiceControls } from './components/VoiceControls';
import { createWidgetRouter, ROUTES } from './router';
import { Button } from './ui/components/Button';
import type { WidgetConfig } from './types';

export interface WidgetAppProps {
  projectId: string;
  apiBaseUrl: string;
  sessionId?: string;
  config?: string; // JSON string from r2wc
}

export function WidgetApp({ projectId, apiBaseUrl, sessionId, config: configString }: WidgetAppProps) {
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [router, setRouter] = useState<ReturnType<typeof createWidgetRouter> | null>(null);

  // Parse config from string (r2wc passes props as strings)
  useEffect(() => {
    const initializeWidget = async () => {
      if (configString) {
        try {
          const parsed = JSON.parse(configString);
          setWidgetConfig(parsed);
          // Create router with config
          const widgetRouter = createWidgetRouter(parsed);
          setRouter(widgetRouter);
          setLoading(false);
        } catch (err) {
          setError('Failed to parse configuration');
          setLoading(false);
        }
      } else if (sessionId) {
        // If we have a session ID but no config, we need to fetch it
        // For now, create a minimal config
        const config = {
          projectId,
          sessionId,
          wsUrl: `ws://localhost:3001/ws/chat?sessionId=${sessionId}`,
          apiBaseUrl,
        } as WidgetConfig;
        setWidgetConfig(config);
        const widgetRouter = createWidgetRouter(config);
        setRouter(widgetRouter);
        setLoading(false);
      } else {
        // No config or sessionId provided - fetch from backend
        try {
          // Generate unique widget instance ID
          const widgetInstanceId = `widget-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

          // Initialize session with backend
          // Build request body - only include valid fields
          const requestBody: Record<string, string> = {
            projectId,
            widgetInstanceId,
          };

          // Only include pageUrl if it's not localhost (validation issue with @IsUrl())
          const pageUrl = window.location.href;
          if (!pageUrl.includes('localhost') && !pageUrl.includes('127.0.0.1')) {
            requestBody.pageUrl = pageUrl;
          }

          // Optional fields
          if (navigator.userAgent) {
            requestBody.userAgent = navigator.userAgent;
          }
          if (navigator.language) {
            requestBody.locale = navigator.language;
          }

          const response = await fetch(`${apiBaseUrl}/v1/widget/session/init`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            // Try to get error details from response
            let errorMessage = response.statusText;
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
              if (Array.isArray(errorMessage)) {
                errorMessage = errorMessage.join(', ');
              }
            } catch {
              // Ignore JSON parse errors
            }
            throw new Error(`Failed to initialize session: ${errorMessage}`);
          }

          const data = await response.json();

          // Create config from backend response
          // Backend returns structure: { sessionId, chat: { wsUrl }, voice: { signalingUrl }, features, theme, uiHints }
          const config: WidgetConfig = {
            projectId,
            sessionId: data.sessionId,
            wsUrl: data.chat?.wsUrl || `${apiBaseUrl.replace('http', 'ws')}/ws/chat?sessionId=${data.sessionId}`,
            apiBaseUrl,
            features: data.features,
            theme: data.theme,
            uiHints: data.uiHints,
            voiceSignalingUrl: data.voice?.signalingUrl,
            rtcConfig: data.voice?.rtcConfig,
          };

          setWidgetConfig(config);
          const widgetRouter = createWidgetRouter(config);
          setRouter(widgetRouter);
          setLoading(false);
        } catch (err) {
          console.error('Failed to initialize widget:', err);
          setError(err instanceof Error ? err.message : 'Failed to initialize widget');
          setLoading(false);
        }
      }
    };

    initializeWidget();
  }, [configString, sessionId, projectId, apiBaseUrl]);

  // Apply theme CSS variables
  useEffect(() => {
    if (widgetConfig?.theme) {
      const root = document.documentElement;
      if (widgetConfig.theme.primaryColor) {
        root.style.setProperty('--widget-primary', widgetConfig.theme.primaryColor);
      }
      if (widgetConfig.theme.radius) {
        root.style.setProperty('--widget-radius', widgetConfig.theme.radius);
      }
      if (widgetConfig.theme.fontScale) {
        root.style.fontSize = `${widgetConfig.theme.fontScale * 16}px`;
      }
    }
  }, [widgetConfig?.theme]);

  if (loading) {
    return (
      <div className="kuzushi-widget-root flex items-center justify-center h-full w-full bg-background text-foreground">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading assistant...</p>
        </div>
      </div>
    );
  }

  if (error || !widgetConfig) {
    return (
      <div className="kuzushi-widget-root flex items-center justify-center h-full w-full bg-background text-foreground">
        <div className="text-center text-destructive">
          <p className="font-semibold">⚠️ Error</p>
          <p className="text-sm mt-2">{error || 'Failed to initialize widget'}</p>
        </div>
      </div>
    );
  }

  if (!router) {
    return null;
  }

  return (
    <KuzushiOverlayProvider>
      <div className="kuzushi-widget-root flex flex-col h-full w-full bg-background text-foreground">
        {/* Navigation Bar */}
        <div className="flex items-center gap-1 p-2 border-b border-border bg-background">
          <Button
            variant={router.state.location.pathname === ROUTES.CHAT ? 'default' : 'ghost'}
            size="sm"
            onPress={() => router.navigate({ to: ROUTES.CHAT })}
          >
            💬 Chat
          </Button>
          <Button
            variant={router.state.location.pathname === ROUTES.HISTORY ? 'default' : 'ghost'}
            size="sm"
            onPress={() => router.navigate({ to: ROUTES.HISTORY })}
          >
            📋 History
          </Button>
          <Button
            variant={router.state.location.pathname === ROUTES.SETTINGS ? 'default' : 'ghost'}
            size="sm"
            onPress={() => router.navigate({ to: ROUTES.SETTINGS })}
          >
            ⚙️ Settings
          </Button>
        </div>

        {/* Router outlet - renders matched route */}
        <div className="flex-1 overflow-hidden">
          <RouterProvider router={router} />
        </div>

        {/* Voice controls (only on chat view) */}
        {widgetConfig.features?.voice && router.state.location.pathname === ROUTES.CHAT && (
          <VoiceControls config={widgetConfig} />
        )}
      </div>
    </KuzushiOverlayProvider>
  );
}

// Keep backward compatibility with old mount system
export interface AppProps {
  config: WidgetConfig;
}

export function App({ config }: AppProps) {
  return (
    <WidgetApp
      projectId={config.projectId}
      apiBaseUrl={config.apiBaseUrl || ''}
      sessionId={config.sessionId}
      config={JSON.stringify(config)}
    />
  );
}
