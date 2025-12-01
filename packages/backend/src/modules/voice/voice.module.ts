import { Module } from '@nestjs/common';
import { VoiceGateway } from './voice.gateway';
import { VoiceService } from './voice.service';
import { WidgetSessionModule } from '../widget-session/widget-session.module';

@Module({
  imports: [WidgetSessionModule],
  providers: [VoiceGateway, VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
