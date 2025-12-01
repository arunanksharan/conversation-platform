import { useState } from 'react';
import { Button } from '../ui/components/Button';
import { Card } from '../ui/components/Card';
import { Separator } from '../ui/components/Separator';
import type { WidgetConfig } from '../types';

export interface SettingsViewProps {
  config: WidgetConfig;
}

export function SettingsView({ config }: SettingsViewProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your assistant experience
        </p>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Appearance */}
        <Card padding="default">
          <div className="space-y-3">
            <div>
              <h3 className="font-medium">Appearance</h3>
              <p className="text-sm text-muted-foreground">
                Customize how the widget looks
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Theme</span>
                <div className="text-sm text-muted-foreground">
                  {config.theme?.primaryColor || 'Default'}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Font Scale</span>
                <div className="text-sm text-muted-foreground">
                  {config.theme?.fontScale || 1.0}x
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card padding="default">
          <div className="space-y-3">
            <div>
              <h3 className="font-medium">Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Manage notification preferences
              </p>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Browser Notifications</div>
                  <div className="text-xs text-muted-foreground">
                    Get notified when you receive new messages
                  </div>
                </div>
                <Button
                  variant={notificationsEnabled ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setNotificationsEnabled(!notificationsEnabled)}
                >
                  {notificationsEnabled ? 'On' : 'Off'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Sound</div>
                  <div className="text-xs text-muted-foreground">
                    Play sound for incoming messages
                  </div>
                </div>
                <Button
                  variant={soundEnabled ? 'default' : 'outline'}
                  size="sm"
                  onPress={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Features */}
        <Card padding="default">
          <div className="space-y-3">
            <div>
              <h3 className="font-medium">Features</h3>
              <p className="text-sm text-muted-foreground">
                Available features for this app
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Text Chat</span>
                <div className="text-sm text-muted-foreground">
                  {config.features?.textChat !== false ? '✓ Enabled' : '✗ Disabled'}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Voice Assistant</span>
                <div className="text-sm text-muted-foreground">
                  {config.features?.voice ? '✓ Enabled' : '✗ Disabled'}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card padding="default">
          <div className="space-y-3">
            <div>
              <h3 className="font-medium">About</h3>
            </div>
            <Separator />
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Session ID</span>
                <span className="font-mono text-xs">{config.sessionId}</span>
              </div>
              <div className="flex justify-between">
                <span>Project ID</span>
                <span className="font-mono text-xs">{config.projectId}</span>
              </div>
              {config.uiHints?.poweredByText && (
                <div className="text-center pt-2 text-xs">
                  {config.uiHints.poweredByText}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
