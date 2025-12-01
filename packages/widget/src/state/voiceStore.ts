import { create } from 'zustand';

type VoiceStatus = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

interface VoiceState {
  status: VoiceStatus;
  isMicMuted: boolean;
  lastError: string | null;
  voiceSessionId: string | null;

  // Actions
  setStatus: (status: VoiceStatus) => void;
  setMicMuted: (isMuted: boolean) => void;
  setError: (error: string | null) => void;
  setVoiceSessionId: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as VoiceStatus,
  isMicMuted: false,
  lastError: null,
  voiceSessionId: null,
};

export const useVoiceStore = create<VoiceState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setMicMuted: (isMicMuted) => set({ isMicMuted }),

  setError: (lastError) =>
    set({ lastError, status: lastError ? 'error' : 'idle' }),

  setVoiceSessionId: (voiceSessionId) => set({ voiceSessionId }),

  reset: () => set(initialState),
}));
