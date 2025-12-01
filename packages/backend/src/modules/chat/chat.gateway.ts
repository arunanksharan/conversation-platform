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
import { ChatService } from './chat.service';
import { WidgetSessionService } from '../widget-session/widget-session.service';

interface WSClientMessage {
  type: 'init' | 'user_message' | 'typing' | 'end_session';
  sessionId?: string;
  messageId?: string;
  content?: string;
  state?: 'on' | 'off';
  metadata?: Record<string, unknown>;
}

interface WSServerMessage {
  type:
    | 'session_ack'
    | 'message'
    | 'token'
    | 'status'
    | 'error'
    | 'extraction_update';
  sessionId?: string;
  messageId?: string;
  role?: 'assistant' | 'system';
  content?: string;
  delta?: string;
  status?: string;
  errorCode?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

@WebSocketGateway({
  path: '/ws/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private sessionService: WidgetSessionService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

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

    // Join session room
    client.join(`session:${sessionId}`);

    // Update last seen
    await this.sessionService.updateLastSeen(sessionId);

    // Send acknowledgment
    this.sendMessage(client, {
      type: 'session_ack',
      sessionId,
      status: 'ok',
    });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const sessionId = client.data.sessionId;
    if (sessionId) {
      await this.sessionService.updateLastSeen(sessionId);
    }
  }

  @SubscribeMessage('user_message')
  async handleUserMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WSClientMessage,
  ) {
    const sessionId = client.data.sessionId;

    if (!sessionId) {
      this.sendError(client, 'NO_SESSION', 'No active session');
      return;
    }

    try {
      this.logger.log(`Received message from session ${sessionId}: ${data.content}`);

      // Save user message to database
      await this.chatService.saveMessage(
        sessionId,
        'USER',
        data.content || '',
      );

      // Get session with config and prompts
      const session = await this.sessionService.getSession(sessionId);

      // Generate streaming LLM response
      const messageId = `msg_${Date.now()}`;

      await this.chatService.generateStreamingResponse(
        session,
        data.content || '',
        async (token: string) => {
          // Stream each token back to client
          this.sendMessage(client, {
            type: 'token',
            messageId,
            delta: token,
          });
        },
        async (fullContent: string) => {
          // Send complete message when done
          const assistantMessage = await this.chatService.saveMessage(
            sessionId,
            'ASSISTANT',
            fullContent,
          );

          this.sendMessage(client, {
            type: 'message',
            messageId: assistantMessage.id,
            role: 'assistant',
            content: fullContent,
          });
        },
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error handling message: ${errorMessage}`, errorStack);
      this.sendError(
        client,
        'MESSAGE_FAILED',
        'Failed to process message',
      );
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WSClientMessage,
  ) {
    const sessionId = client.data.sessionId;
    // Broadcast typing indicator to other clients in session
    client.to(`session:${sessionId}`).emit('typing', {
      state: data.state,
    });
  }

  @SubscribeMessage('end_session')
  async handleEndSession(@ConnectedSocket() client: Socket) {
    const sessionId = client.data.sessionId;
    if (sessionId) {
      await this.sessionService.endSession(sessionId);
      this.sendMessage(client, {
        type: 'status',
        status: 'session_ended',
      });
    }
  }

  private sendMessage(client: Socket, message: WSServerMessage) {
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
