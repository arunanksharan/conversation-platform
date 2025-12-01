import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { WidgetSessionService } from '../widget-session/widget-session.service';

interface VoiceClientMessage {
  type: 'init' | 'offer' | 'answer' | 'ice_candidate' | 'end_voice_session';
  sessionId?: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}

interface VoiceServerMessage {
  type:
    | 'voice_session_started'
    | 'answer'
    | 'ice_candidate'
    | 'voice_session_ended'
    | 'error';
  voiceSessionId?: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  reason?: string;
  errorCode?: string;
  message?: string;
}

@WebSocketGateway({
  path: '/ws/voice',
  cors: { origin: '*' },
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VoiceGateway.name);

  constructor(
    private voiceService: VoiceService,
    private sessionService: WidgetSessionService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Voice client connected: ${client.id}`);

    // Extract sessionId and token from query
    const sessionId = client.handshake.query.sessionId as string;
    const token = client.handshake.query.token as string;

    if (!sessionId || !token) {
      this.sendError(client, 'MISSING_AUTH', 'sessionId and token required');
      client.disconnect();
      return;
    }

    // Validate token
    const isValid = this.sessionService.validateSessionToken(sessionId, token);
    if (!isValid) {
      this.sendError(client, 'INVALID_TOKEN', 'Invalid session token');
      client.disconnect();
      return;
    }

    // Store session info in socket data
    client.data.sessionId = sessionId;

    this.logger.log(`Voice client authenticated for session: ${sessionId}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Voice client disconnected: ${client.id}`);

    const voiceSessionId = client.data.voiceSessionId;
    if (voiceSessionId) {
      // End voice session
      await this.voiceService.endVoiceSession(voiceSessionId);
    }
  }

  @SubscribeMessage('init')
  async handleInit(
    @ConnectedSocket() client: Socket,
    @MessageBody() _data: VoiceClientMessage,
  ) {
    const sessionId = client.data.sessionId;

    if (!sessionId) {
      this.sendError(client, 'NO_SESSION', 'No active session');
      return;
    }

    try {
      this.logger.log(`Initializing voice session for: ${sessionId}`);

      // Create voice session
      const voiceSession = await this.voiceService.createVoiceSession(sessionId);

      // Store voice session ID
      client.data.voiceSessionId = voiceSession.id;

      // Send acknowledgment
      this.sendMessage(client, {
        type: 'voice_session_started',
        voiceSessionId: voiceSession.id,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to init voice session: ${errorMessage}`);
      this.sendError(client, 'INIT_FAILED', 'Failed to initialize voice session');
    }
  }

  @SubscribeMessage('offer')
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: VoiceClientMessage,
  ) {
    const voiceSessionId = client.data.voiceSessionId;

    if (!voiceSessionId) {
      this.sendError(client, 'NO_VOICE_SESSION', 'Voice session not initialized');
      return;
    }

    try {
      this.logger.log(`Received offer for voice session: ${voiceSessionId}`);

      // In a real implementation, you would:
      // 1. Forward the offer to a media server (LiveKit, Daily, etc.)
      // 2. Get an answer SDP from the media server
      // 3. Return the answer to the client

      // For now, we'll create a dummy answer
      // In production, integrate with actual WebRTC media server
      const answer = await this.voiceService.handleOffer(
        voiceSessionId,
        data.sdp!,
      );

      this.sendMessage(client, {
        type: 'answer',
        sdp: answer,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to handle offer: ${errorMessage}`);
      this.sendError(client, 'OFFER_FAILED', 'Failed to process offer');
    }
  }

  @SubscribeMessage('answer')
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: VoiceClientMessage,
  ) {
    const voiceSessionId = client.data.voiceSessionId;

    if (!voiceSessionId) {
      this.sendError(client, 'NO_VOICE_SESSION', 'Voice session not initialized');
      return;
    }

    try {
      this.logger.log(`Received answer for voice session: ${voiceSessionId}`);

      // Handle answer (forward to media server if needed)
      await this.voiceService.handleAnswer(voiceSessionId, data.sdp!);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to handle answer: ${errorMessage}`);
      this.sendError(client, 'ANSWER_FAILED', 'Failed to process answer');
    }
  }

  @SubscribeMessage('ice_candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() _data: VoiceClientMessage,
  ) {
    const voiceSessionId = client.data.voiceSessionId;

    if (!voiceSessionId) {
      return;
    }

    try {
      // In production, forward ICE candidate to media server
      this.logger.log(`Received ICE candidate for: ${voiceSessionId}`);

      // For peer-to-peer signaling, you might relay to other peer
      // For server-mediated, forward to media server
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to handle ICE candidate: ${errorMessage}`);
    }
  }

  @SubscribeMessage('end_voice_session')
  async handleEndVoiceSession(@ConnectedSocket() client: Socket) {
    const voiceSessionId = client.data.voiceSessionId;

    if (voiceSessionId) {
      await this.voiceService.endVoiceSession(voiceSessionId);
      this.sendMessage(client, {
        type: 'voice_session_ended',
        reason: 'USER_ENDED',
      });
      client.data.voiceSessionId = null;
    }
  }

  private sendMessage(client: Socket, message: VoiceServerMessage) {
    client.emit('message', message);
  }

  private sendError(client: Socket, errorCode: string, message: string) {
    client.emit('message', {
      type: 'error',
      errorCode,
      message,
    });
  }
}
