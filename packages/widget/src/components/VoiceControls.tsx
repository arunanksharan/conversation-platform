import { useEffect, useRef } from 'react';
import { Button } from '../ui/components/Button';
import { Badge } from '../ui/components/Badge';
import { Separator } from '../ui/components/Separator';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import type { WidgetConfig } from '../types';

interface VoiceControlsProps {
  config: WidgetConfig;
}

export function VoiceControls({ config }: VoiceControlsProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    startVoiceSession,
    stopVoiceSession,
    toggleMic,
    status,
    isMicMuted,
    remoteStream,
  } = useVoiceAssistant({
    signalingUrl: config.voiceSignalingUrl || '',
    rtcConfig: config.rtcConfig,
    sessionId: config.sessionId,
    token: config.token,
  });

  // Connect remote stream to audio element
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Don't show if voice is not enabled
  if (!config.features?.voice || !config.voiceSignalingUrl) {
    return null;
  }

  const isLive = status === 'live';
  const isConnecting = status === 'connecting';

  return (
    <>
      <Separator />
      <div className="p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge
              variant={
                isLive
                  ? 'success'
                  : isConnecting
                  ? 'warning'
                  : 'secondary'
              }
            >
              {isLive
                ? '● Voice Active'
                : isConnecting
                ? '● Connecting...'
                : 'Voice Assistant'}
            </Badge>
          </div>

          <div className="flex gap-2">
            {isLive && (
              <Button
                variant={isMicMuted ? 'destructive' : 'outline'}
                size="sm"
                onPress={toggleMic}
              >
                {isMicMuted ? '🔇 Unmute' : '🎤 Mute'}
              </Button>
            )}

            <Button
              variant={isLive ? 'destructive' : 'default'}
              size="sm"
              onPress={isLive ? stopVoiceSession : startVoiceSession}
              isDisabled={isConnecting}
            >
              {isLive
                ? config.uiHints?.endCallButtonText || '📞 End Call'
                : isConnecting
                ? 'Starting...'
                : config.uiHints?.voiceButtonText || '🎙️ Start Voice'}
            </Button>
          </div>
        </div>

        {/* Hidden audio element for remote stream */}
        <audio ref={audioRef} autoPlay playsInline className="hidden" />
      </div>
    </>
  );
}
