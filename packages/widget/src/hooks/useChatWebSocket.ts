import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '../state/chatStore';
import { useExtractionStore } from '../state/extractionStore';
import type { WSClientMessage, WSServerMessage, ChatMessage, ExtractionResult } from '../types';

interface UseChatWebSocketOptions {
  wsUrl: string;
  projectId: string;
  sessionId: string;
  token?: string;
}

export function useChatWebSocket({
  wsUrl,
  projectId,
  sessionId,
  token,
}: UseChatWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const { setStatus, addMessage, setError, startStreaming, appendStreamingToken } = useChatStore();

  const connect = useCallback(() => {
    try {
      // Extract base URL and query params from wsUrl
      const url = new URL(wsUrl);
      const baseUrl = `${url.protocol}//${url.host}`;

      // Extract token from URL query params if not provided separately
      const urlToken = url.searchParams.get('token');
      const urlSessionId = url.searchParams.get('sessionId');
      const effectiveToken = token || urlToken || '';
      const effectiveSessionId = sessionId || urlSessionId || '';

      setStatus('connecting');

      // Create Socket.IO connection
      const socket = io(baseUrl, {
        path: '/ws/chat',
        query: {
          sessionId: effectiveSessionId,
          token: effectiveToken,
        },
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[ChatWS] Connected');
        setStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
      });

      socket.on('message', (message: WSServerMessage) => {
        try {
          switch (message.type) {
            case 'session_ack':
              console.log('[ChatWS] Session acknowledged:', message.sessionId);
              break;

            case 'message':
              // Full message from assistant
              const chatMessage: ChatMessage = {
                id: message.messageId,
                role: message.role,
                content: message.content,
                timestamp: new Date().toISOString(),
              };
              addMessage(chatMessage);
              break;

            case 'token':
              // Streaming token
              if (!useChatStore.getState().currentStreamingMessageId) {
                startStreaming(message.messageId);
              }
              appendStreamingToken(message.delta);
              break;

            case 'status':
              console.log('[ChatWS] Status:', message.status);
              break;

            case 'error':
              console.error('[ChatWS] Error:', message.message);
              setError(message.message);
              break;

            case 'extraction_update':
              // Handle medical field extraction updates
              console.log('[ChatWS] Extraction update:', message.extractionId, message.fields.length, 'fields');
              const extractionResult: ExtractionResult = {
                extractionId: message.extractionId,
                fields: message.fields,
                status: message.extractionStatus,
                confidence: message.overallConfidence,
                timestamp: new Date().toISOString(),
              };
              useExtractionStore.getState().addExtraction(extractionResult);
              break;

            default:
              console.warn('[ChatWS] Unknown message type:', message);
          }
        } catch (err) {
          console.error('[ChatWS] Failed to handle message:', err);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('[ChatWS] Connection error:', error);
        setStatus('error');
        setError('WebSocket connection error');
      });

      socket.on('disconnect', (reason) => {
        console.log('[ChatWS] Disconnected:', reason);
        setStatus('disconnected');

        // Attempt reconnection with exponential backoff if not intentional
        if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          console.log(`[ChatWS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(() => socket.connect(), delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Failed to reconnect to chat server');
        }
      });
    } catch (err) {
      console.error('[ChatWS] Connection failed:', err);
      setStatus('error');
      setError('Failed to connect to chat server');
    }
  }, [wsUrl, projectId, sessionId, token, setStatus, setError, addMessage, startStreaming, appendStreamingToken]);

  const sendMessage = useCallback((content: string) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.error('[ChatWS] Cannot send message: not connected');
      return;
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const message: WSClientMessage = {
      type: 'user_message',
      messageId,
      content,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    // Add optimistic user message to UI
    const userMessage: ChatMessage = {
      id: messageId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);

    // Send to server via Socket.IO
    socketRef.current.emit('user_message', message);
  }, [addMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, [setStatus]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const status = useChatStore((state) => state.connectionStatus);

  return {
    sendMessage,
    status,
    disconnect,
    reconnect: connect,
  };
}
