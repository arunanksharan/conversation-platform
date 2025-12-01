import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new voice session
   */
  async createVoiceSession(widgetSessionId: string) {
    return this.prisma.voiceSession.create({
      data: {
        widgetSessionId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Handle WebRTC offer
   * In production, this would integrate with a media server like LiveKit or Daily
   */
  async handleOffer(voiceSessionId: string, offerSdp: string): Promise<string> {
    this.logger.log(`Processing offer for voice session: ${voiceSessionId}`);

    // TODO: In production, integrate with actual WebRTC media server
    // Example with LiveKit:
    // 1. Create LiveKit room
    // 2. Generate participant token
    // 3. Return answer SDP from LiveKit

    // For now, return a placeholder answer
    // This is just for demonstration - won't actually work without real media server
    const answerSdp = offerSdp.replace('a=sendrecv', 'a=recvonly');

    return answerSdp;
  }

  /**
   * Handle WebRTC answer
   */
  async handleAnswer(voiceSessionId: string, _answerSdp: string): Promise<void> {
    this.logger.log(`Processing answer for voice session: ${voiceSessionId}`);

    // Update voice session with signaling info
    await this.prisma.voiceSession.update({
      where: { id: voiceSessionId },
      data: {
        signalingChannelId: 'negotiated',
      },
    });
  }

  /**
   * End a voice session
   */
  async endVoiceSession(voiceSessionId: string) {
    this.logger.log(`Ending voice session: ${voiceSessionId}`);

    return this.prisma.voiceSession.update({
      where: { id: voiceSessionId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });
  }

  /**
   * Get voice session stats
   */
  async getVoiceSessionStats(voiceSessionId: string) {
    return this.prisma.voiceSession.findUnique({
      where: { id: voiceSessionId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
        stats: true,
      },
    });
  }
}
