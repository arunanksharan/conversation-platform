import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { WidgetSessionModule } from './modules/widget-session/widget-session.module';
import { ChatModule } from './modules/chat/chat.module';
import { VoiceModule } from './modules/voice/voice.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AppManagementModule } from './modules/app-management/app-management.module';
import { ConfigManagementModule } from './modules/config-management/config-management.module';
import { PromptModule } from './modules/prompt/prompt.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Serve static files (widget loader)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'static'),
      serveRoot: '/static',
    }),

    // Database
    PrismaModule,

    // Health Check
    HealthModule,

    // Authentication
    AuthModule,

    // Widget APIs
    WidgetSessionModule,
    ChatModule,
    VoiceModule,

    // Admin APIs
    TenantModule,
    AppManagementModule,
    ConfigManagementModule,
    PromptModule,
  ],
})
export class AppModule {}
