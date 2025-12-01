import { create } from 'zustand';
import type { ChatMessage } from '../types';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

interface ChatState {
  messages: ChatMessage[];
  connectionStatus: ConnectionStatus;
  error: string | null;
  isTyping: boolean;
  currentStreamingMessageId: string | null;
  streamingContent: string;

  // Actions
  addMessage: (message: ChatMessage) => void;
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  setTyping: (isTyping: boolean) => void;
  startStreaming: (messageId: string) => void;
  appendStreamingToken: (delta: string) => void;
  finalizeStreamingMessage: (message: ChatMessage) => void;
  reset: () => void;
}

const initialState = {
  messages: [],
  connectionStatus: 'idle' as ConnectionStatus,
  error: null,
  isTyping: false,
  currentStreamingMessageId: null,
  streamingContent: '',
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      isTyping: false,
    })),

  setStatus: (connectionStatus) => set({ connectionStatus }),

  setError: (error) => set({ error }),

  setTyping: (isTyping) => set({ isTyping }),

  startStreaming: (messageId) =>
    set({
      currentStreamingMessageId: messageId,
      streamingContent: '',
      isTyping: true,
    }),

  appendStreamingToken: (delta) =>
    set((state) => ({
      streamingContent: state.streamingContent + delta,
    })),

  finalizeStreamingMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      currentStreamingMessageId: null,
      streamingContent: '',
      isTyping: false,
    })),

  reset: () => set(initialState),
}));
