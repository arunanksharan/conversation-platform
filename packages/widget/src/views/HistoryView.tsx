import { useMemo } from 'react';
import { Card } from '../ui/components/Card';
import { Badge } from '../ui/components/Badge';
import { useChatStore } from '../state/chatStore';
import type { WidgetConfig } from '../types';

export interface HistoryViewProps {
  config: WidgetConfig;
}

export function HistoryView({ config: _config }: HistoryViewProps) {
  const { messages } = useChatStore();

  // Group messages by date
  const messagesByDate = useMemo(() => {
    const groups = new Map<string, typeof messages>();

    messages.forEach((message) => {
      const date = new Date(message.timestamp).toLocaleDateString();
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(message);
    });

    return Array.from(groups.entries()).sort((a, b) =>
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [messages]);

  const totalMessages = messages.length;
  const userMessages = messages.filter(m => m.role === 'user').length;
  const assistantMessages = messages.filter(m => m.role === 'assistant').length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Conversation History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review your past conversations
        </p>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex gap-4 justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalMessages}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{userMessages}</div>
            <div className="text-xs text-muted-foreground">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{assistantMessages}</div>
            <div className="text-xs text-muted-foreground">Received</div>
          </div>
        </div>
      </div>

      {/* History Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messagesByDate.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No conversation history yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Messages will appear here as you chat
            </p>
          </div>
        ) : (
          messagesByDate.map(([date, msgs]) => (
            <div key={date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2">
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  {date}
                </div>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {msgs.map((message) => (
                  <Card
                    key={message.id}
                    padding="sm"
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <Badge
                        variant={message.role === 'user' ? 'default' : 'secondary'}
                        className="shrink-0"
                      >
                        {message.role === 'user' ? 'You' : 'AI'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{message.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
