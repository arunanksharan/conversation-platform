import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WidgetSessionService } from './widget-session.service';
import { InitSessionDto } from './dto/init-session.dto';
import { InitSessionResponseDto } from './dto/init-session-response.dto';

@ApiTags('widget')
@Controller('v1/widget/session')
export class WidgetSessionController {
  constructor(private readonly sessionService: WidgetSessionService) {}

  @Post('init')
  @HttpCode(200)
  @ApiOperation({ summary: 'Initialize a new widget session for a client' })
  @ApiResponse({
    status: 200,
    description: 'Session initialized successfully',
    type: InitSessionResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async initSession(
    @Body() dto: InitSessionDto,
  ): Promise<InitSessionResponseDto> {
    return this.sessionService.initSession(dto);
  }
}
