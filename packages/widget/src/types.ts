/**
 * Widget theme configuration from backend
 */
export interface WidgetThemeConfig {
  primaryColor?: string;
  radius?: string;
  fontScale?: number;
  [key: string]: unknown;
}

/**
 * UI hints and customization from backend
 */
export interface UiHints {
  welcomeMessage?: string;
  widgetTitle?: string;
  inputPlaceholder?: string;
  sendButtonText?: string;
  voiceButtonText?: string;
  endCallButtonText?: string;
  emptyStateMessage?: string;
  emptyStateSubtitle?: string;
  poweredByText?: string;
  logoUrl?: string;
}

/**
 * Widget configuration passed from loader
 */
export interface WidgetConfig {
  /** Project ID from backend */
  projectId: string;
  /** Session ID from backend init */
  sessionId: string;
  /** WebSocket URL for chat */
  wsUrl: string;
  /** WebSocket URL for voice signaling */
  voiceSignalingUrl?: string;
  /** RTCConfiguration for WebRTC */
  rtcConfig?: RTCConfiguration;
  /** Theme configuration */
  theme?: WidgetThemeConfig;
  /** UI customization hints */
  uiHints?: UiHints;
  /** Authentication token */
  token?: string;
  /** Language/locale */
  language?: string;
  /** Feature flags */
  features?: {
    textChat?: boolean;
    voice?: boolean;
    extraction?: boolean;
  };
  /** API base URL */
  apiBaseUrl?: string;
}

/**
 * Mount options for the widget
 */
export interface MountOptions {
  shadowRoot: ShadowRoot;
  config: WidgetConfig;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/**
 * WebSocket message types - Client to Server
 */
export type WSClientMessage =
  | { type: 'init'; sessionId: string }
  | { type: 'user_message'; messageId: string; content: string; metadata?: Record<string, unknown> }
  | { type: 'typing'; state: 'on' | 'off' }
  | { type: 'end_session' };

/**
 * Extracted field from medical conversation
 */
export interface ExtractedField {
  fieldName: string;
  value: unknown;
  confidence: number;
}

/**
 * Extraction result from backend
 */
export interface ExtractionResult {
  extractionId: string;
  fields: ExtractedField[];
  status: 'partial' | 'complete';
  confidence: number;
  timestamp: string;
}

/**
 * WebSocket message types - Server to Client
 */
export type WSServerMessage =
  | { type: 'session_ack'; sessionId: string; status: 'ok' | 'error' }
  | { type: 'message'; messageId: string; role: 'assistant' | 'system'; content: string; metadata?: Record<string, unknown> }
  | { type: 'token'; messageId: string; delta: string }
  | { type: 'status'; status: string }
  | { type: 'error'; errorCode: string; message: string }
  | {
      type: 'extraction_update';
      extractionId: string;
      fields: ExtractedField[];
      extractionStatus: 'partial' | 'complete';
      overallConfidence: number;
    };

/**
 * Voice signaling message types - Client to Server
 */
export type VoiceClientMessage =
  | { type: 'init'; sessionId: string }
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice_candidate'; candidate: RTCIceCandidateInit }
  | { type: 'end_voice_session' };

/**
 * Voice signaling message types - Server to Client
 */
export type VoiceServerMessage =
  | { type: 'voice_session_started'; voiceSessionId: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice_candidate'; candidate: RTCIceCandidateInit }
  | { type: 'voice_session_ended'; reason?: string }
  | { type: 'error'; errorCode: string; message: string };
