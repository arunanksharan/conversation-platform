import { useEffect, useRef, useCallback, useState } from 'react';
import { useVoiceStore } from '../state/voiceStore';
import type { VoiceClientMessage, VoiceServerMessage } from '../types';

interface UseVoiceAssistantOptions {
  signalingUrl: string;
  rtcConfig?: RTCConfiguration;
  sessionId: string;
  token?: string;
}

export function useVoiceAssistant({
  signalingUrl,
  rtcConfig,
  sessionId,
  token,
}: UseVoiceAssistantOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const { setStatus, setMicMuted, setError, setVoiceSessionId } = useVoiceStore();

  /**
   * Start voice session - must be called on user gesture
   */
  const startVoiceSession = useCallback(async () => {
    try {
      setStatus('connecting');
      setError(null);

      // 1. Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection(rtcConfig || {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('[VoiceRTC] Remote track received:', event.track.kind);
        setRemoteStream(event.streams[0]);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          const message: VoiceClientMessage = {
            type: 'ice_candidate',
            candidate: event.candidate.toJSON(),
          };
          wsRef.current.send(JSON.stringify(message));
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[VoiceRTC] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setStatus('live');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          setStatus('error');
          setError('Voice connection failed');
        }
      };

      // 3. Open signaling WebSocket
      const url = new URL(signalingUrl);
      url.searchParams.set('sessionId', sessionId);
      if (token) {
        url.searchParams.set('token', token);
      }

      const ws = new WebSocket(url.toString());
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('[VoiceWS] Signaling connected');

        // Send init
        const initMessage: VoiceClientMessage = {
          type: 'init',
          sessionId,
        };
        ws.send(JSON.stringify(initMessage));

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const offerMessage: VoiceClientMessage = {
          type: 'offer',
          sdp: offer.sdp!,
        };
        ws.send(JSON.stringify(offerMessage));
      };

      ws.onmessage = async (event) => {
        try {
          const message: VoiceServerMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'voice_session_started':
              console.log('[VoiceWS] Session started:', message.voiceSessionId);
              setVoiceSessionId(message.voiceSessionId);
              break;

            case 'answer':
              console.log('[VoiceWS] Received answer');
              if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription({
                  type: 'answer',
                  sdp: message.sdp,
                });
              }
              break;

            case 'ice_candidate':
              console.log('[VoiceWS] Received ICE candidate');
              await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
              break;

            case 'voice_session_ended':
              console.log('[VoiceWS] Session ended:', message.reason);
              stopVoiceSession();
              break;

            case 'error':
              console.error('[VoiceWS] Error:', message.message);
              setError(message.message);
              stopVoiceSession();
              break;
          }
        } catch (err) {
          console.error('[VoiceWS] Failed to handle message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[VoiceWS] Error:', error);
        setError('Voice signaling error');
        stopVoiceSession();
      };

      ws.onclose = () => {
        console.log('[VoiceWS] Signaling closed');
      };
    } catch (err) {
      console.error('[Voice] Failed to start:', err);
      setStatus('error');
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start voice session');
      }
      stopVoiceSession();
    }
  }, [signalingUrl, rtcConfig, sessionId, token, setStatus, setError, setVoiceSessionId]);

  /**
   * Stop voice session and clean up resources
   */
  const stopVoiceSession = useCallback(() => {
    // Close signaling WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        const message: VoiceClientMessage = {
          type: 'end_voice_session',
        };
        wsRef.current.send(JSON.stringify(message));
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Clear remote stream
    setRemoteStream(null);

    // Reset state
    setStatus('ended');
    setVoiceSessionId(null);
    setMicMuted(false);
  }, [setStatus, setVoiceSessionId, setMicMuted]);

  /**
   * Toggle microphone mute
   */
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  }, [setMicMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, [stopVoiceSession]);

  const { status, isMicMuted } = useVoiceStore();

  return {
    startVoiceSession,
    stopVoiceSession,
    toggleMic,
    status,
    isMicMuted,
    remoteStream,
  };
}
