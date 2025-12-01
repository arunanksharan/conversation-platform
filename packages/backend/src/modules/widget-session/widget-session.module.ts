import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { WidgetSessionController } from './widget-session.controller';
import { WidgetSessionService } from './widget-session.service';

@Module({
  imports: [AuthModule],
  controllers: [WidgetSessionController],
  providers: [WidgetSessionService],
  exports: [WidgetSessionService],
})
export class WidgetSessionModule {}
