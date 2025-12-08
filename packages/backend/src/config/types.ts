/**
 * Configuration types for AppConfig JSON fields
 */

// ============================================================================
// LLM Configuration
// ============================================================================

export interface LlmConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPromptProfileId?: string;
  toolProfiles?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Voice Configuration
// ============================================================================

export interface VoiceConfig {
  provider: 'livekit' | 'daily' | 'custom';
  signalingPath: string;
  iceServers: RTCIceServer[];
  llmProfileId?: string;
  ttsProvider?: 'openai' | 'elevenlabs' | 'google';
  sttProvider?: 'openai' | 'deepgram' | 'google';
  maxDurationSeconds?: number;
}

export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// ============================================================================
// Features Configuration
// ============================================================================

export interface FeaturesConfig {
  textChat: boolean;
  voice: boolean;
  allowFileUpload?: boolean;
  maxConcurrentSessions?: number;
  extraction?: boolean; // Medical field extraction feature
}

// ============================================================================
// UI Theme Configuration
// ============================================================================

export interface UiThemeConfig {
  primaryColor?: string;
  radius?: string;
  fontScale?: number;
  [key: string]: unknown;
}

// ============================================================================
// Complete AppConfig structure
// ============================================================================

export interface AppConfigData {
  features: FeaturesConfig;
  uiTheme: UiThemeConfig;
  llmConfig: LlmConfig;
  voiceConfig: VoiceConfig;
}
