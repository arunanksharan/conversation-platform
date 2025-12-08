import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { WidgetSessionModule } from '../widget-session/widget-session.module';
import { ExtractionModule } from '../extraction/extraction.module';

@Module({
  imports: [WidgetSessionModule, ExtractionModule],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
