import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';
import { InitSessionDto } from './dto/init-session.dto';
import { InitSessionResponseDto } from './dto/init-session-response.dto';
import {
  FeaturesConfig,
  UiThemeConfig,
  VoiceConfig,
} from '../../config/types';

@Injectable()
export class WidgetSessionService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  /**
   * Initialize a new widget session
   */
  async initSession(dto: InitSessionDto): Promise<InitSessionResponseDto> {
    // 1. Find app by projectId
    const app = await this.prisma.app.findUnique({
      where: { projectId: dto.projectId },
      include: {
        configs: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!app) {
      throw new NotFoundException(
        `App not found for projectId: ${dto.projectId}`,
      );
    }

    if (!app.isActive) {
      throw new BadRequestException('This app is currently inactive');
    }

    if (!app.configs || app.configs.length === 0) {
      throw new BadRequestException('No active configuration found for this app');
    }

    const config = app.configs[0];
    const configData = config as any;

    // Parse config data
    const features = configData.features as FeaturesConfig;
    const uiTheme = configData.uiTheme as UiThemeConfig;
    const voiceConfig = configData.voiceConfig as VoiceConfig;

    // 2. Create widget session
    const session = await this.prisma.widgetSession.create({
      data: {
        appId: app.id,
        configVersion: config.version,
        externalUserId: dto.externalUserId,
        widgetInstanceId: dto.widgetInstanceId,
        hostOrigin: dto.hostOrigin,
        hostPath: dto.pageUrl,
        userAgent: dto.userAgent,
        locale: dto.locale,
        status: 'ACTIVE',
      },
    });

    // 3. Build WebSocket URLs
    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:3001');
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsBaseUrl = baseUrl.replace(/^https?/, wsProtocol);

    // Generate secure JWT token
    const token = this.authService.generateSessionToken(session.id, app.projectId);

    const chatWsUrl = `${wsBaseUrl}/ws/chat?sessionId=${session.id}&token=${token}`;
    const voiceWsUrl = `${wsBaseUrl}/ws/voice?sessionId=${session.id}&token=${token}`;

    // 4. Build UI hints from app and prompts
    const welcomePrompt = await this.prisma.promptProfile.findFirst({
      where: {
        appId: app.id,
        kind: 'PRE_MESSAGE',
        isDefault: true,
      },
    });

    // Build response
    const response: InitSessionResponseDto = {
      sessionId: session.id,
      configVersion: config.version,
      features,
      theme: uiTheme,
      chat: {
        wsUrl: chatWsUrl,
      },
      uiHints: {
        welcomeMessage: welcomePrompt?.content || 'Welcome! How can I assist you today?',
        widgetTitle: app.name || 'AI Assistant',
        inputPlaceholder: 'Type your message...',
        sendButtonText: 'Send',
        voiceButtonText: '🎙️ Start Voice',
        endCallButtonText: '📞 End Call',
        emptyStateMessage: '👋 Hi there!',
        emptyStateSubtitle: 'How can I help you today?',
        poweredByText: 'Powered by Kuzushi',
      },
    };

    // Add voice config if enabled
    if (features.voice && voiceConfig) {
      response.voice = {
        enabled: true,
        signalingUrl: voiceWsUrl,
        rtcConfig: {
          iceServers: voiceConfig.iceServers,
        },
      };
    }

    return response;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string) {
    const session = await this.prisma.widgetSession.findUnique({
      where: { id: sessionId },
      include: {
        app: {
          include: {
            configs: {
              where: { isActive: true },
              take: 1,
            },
            promptProfiles: {
              where: { isDefault: true },
            },
          },
        },
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  /**
   * Update session last seen timestamp
   */
  async updateLastSeen(sessionId: string) {
    return this.prisma.widgetSession.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
  }

  /**
   * End a session
   */
  async endSession(sessionId: string) {
    return this.prisma.widgetSession.update({
      where: { id: sessionId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });
  }

  /**
   * Validate session token using JWT
   */
  validateSessionToken(sessionId: string, token: string): boolean {
    return this.authService.validateTokenForSession(token, sessionId);
  }
}
