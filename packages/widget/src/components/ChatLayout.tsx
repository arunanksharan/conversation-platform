import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/components/Button';
import { Input } from '../ui/components/Input';
import { Card } from '../ui/components/Card';
import { Avatar } from '../ui/components/Avatar';
import { Badge } from '../ui/components/Badge';
import { useChatStore } from '../state/chatStore';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { ExtractionPanel } from './ExtractionPanel';
import type { WidgetConfig } from '../types';

interface ChatLayoutProps {
  config: WidgetConfig;
}

export function ChatLayout({ config }: ChatLayoutProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isTyping, streamingContent } = useChatStore();
  const { sendMessage, status } = useChatWebSocket({
    wsUrl: config.wsUrl,
    projectId: config.projectId,
    sessionId: config.sessionId,
    token: config.token,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          {config.uiHints?.logoUrl && (
            <Avatar
              src={config.uiHints.logoUrl}
              alt={config.uiHints?.widgetTitle || 'AI Assistant'}
              fallback="AI"
              size="sm"
            />
          )}
          <h2 className="font-semibold text-lg">
            {config.uiHints?.widgetTitle || 'AI Assistant'}
          </h2>
        </div>
        <Badge
          variant={
            status === 'connected'
              ? 'success'
              : status === 'connecting'
              ? 'warning'
              : 'destructive'
          }
        >
          {status === 'connected' ? '● Online' : status === 'connecting' ? '● Connecting' : '● Offline'}
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-lg">
              {config.uiHints?.emptyStateMessage || '👋 Welcome!'}
            </p>
            <p className="text-sm mt-2">
              {config.uiHints?.emptyStateSubtitle || 'How can I help you today?'}
            </p>
            {config.uiHints?.welcomeMessage && (
              <div className="mt-4 p-4 bg-muted rounded-lg max-w-md mx-auto text-left">
                <p className="text-sm">{config.uiHints.welcomeMessage}</p>
              </div>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role !== 'user' && (
              <Avatar
                fallback="AI"
                size="sm"
                className="mt-1"
              />
            )}
            <Card
              padding="sm"
              className={`max-w-[75%] ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <p className="text-xs opacity-70 mt-1.5">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </Card>
            {message.role === 'user' && (
              <Avatar
                fallback="U"
                size="sm"
                className="mt-1"
              />
            )}
          </div>
        ))}

        {/* Streaming message */}
        {isTyping && streamingContent && (
          <div className="flex gap-2 justify-start">
            <Avatar
              fallback="AI"
              size="sm"
              className="mt-1"
            />
            <Card padding="sm" className="max-w-[75%] bg-muted">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{streamingContent}</p>
              <div className="inline-block w-1 h-4 bg-current animate-pulse ml-1" />
            </Card>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !streamingContent && (
          <div className="flex gap-2 justify-start">
            <Avatar
              fallback="AI"
              size="sm"
              className="mt-1"
            />
            <Card padding="sm" className="bg-muted">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Extraction Panel - shown when extraction is enabled */}
      {config.features?.extraction && (
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <ExtractionPanel compact showConfidence />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.uiHints?.inputPlaceholder || 'Type your message...'}
            disabled={status !== 'connected'}
            className="flex-1"
          />
          <Button
            onPress={handleSend}
            isDisabled={!inputValue.trim() || status !== 'connected'}
            size="default"
          >
            {config.uiHints?.sendButtonText || 'Send'}
          </Button>
        </div>
        {config.uiHints?.poweredByText && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            {config.uiHints.poweredByText}
          </p>
        )}
      </div>
    </div>
  );
}
