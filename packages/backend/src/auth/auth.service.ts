import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface SessionTokenPayload {
  sessionId: string;
  projectId: string;
  type: 'widget';
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  /**
   * Generate a secure JWT token for a widget session
   */
  generateSessionToken(sessionId: string, projectId: string): string {
    const payload: Omit<SessionTokenPayload, 'iat' | 'exp'> = {
      sessionId,
      projectId,
      type: 'widget',
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Validate and decode a session token
   */
  validateSessionToken(token: string): SessionTokenPayload {
    try {
      return this.jwtService.verify<SessionTokenPayload>(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Validate token and check if it matches the expected session
   */
  validateTokenForSession(token: string, sessionId: string): boolean {
    try {
      const payload = this.validateSessionToken(token);
      return payload.sessionId === sessionId;
    } catch {
      return false;
    }
  }

  /**
   * Extract session ID from token without throwing
   */
  extractSessionId(token: string): string | null {
    try {
      const payload = this.validateSessionToken(token);
      return payload.sessionId;
    } catch {
      return null;
    }
  }
}
