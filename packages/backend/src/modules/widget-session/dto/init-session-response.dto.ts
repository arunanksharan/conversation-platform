import {
  FeaturesConfig,
  UiThemeConfig,
  RTCIceServer,
} from '../../../config/types';

export class InitSessionResponseDto {
  sessionId: string;
  configVersion: number;
  features: FeaturesConfig;
  theme: UiThemeConfig;
  chat: {
    wsUrl: string;
  };
  voice?: {
    enabled: boolean;
    signalingUrl: string;
    rtcConfig?: {
      iceServers: RTCIceServer[];
    };
  };
  uiHints: {
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
  };
}
