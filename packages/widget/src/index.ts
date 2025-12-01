// Main widget exports
export { WidgetApp, App } from './App';
export type { WidgetAppProps, AppProps } from './App';

// Mount function for backward compatibility
export { mount } from './mount';
export type { MountOptions } from './types';

// Types
export type {
  WidgetConfig,
  WidgetThemeConfig,
  UiHints,
  ChatMessage,
  WSClientMessage,
  WSServerMessage,
  VoiceClientMessage,
  VoiceServerMessage,
} from './types';
