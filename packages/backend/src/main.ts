import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS configuration
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
  const origin = corsOrigin.includes(',') ? corsOrigin.split(',') : corsOrigin;

  app.enableCors({
    origin,
    credentials: true,
  });

  // Global prefix for REST API
  app.setGlobalPrefix('api');

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Kuzushi Healthcare Conversation Platform API')
    .setDescription('API documentation for the Healthcare Conversation Platform backend')
    .setVersion('1.0')
    .addTag('health', 'Health check endpoints')
    .addTag('tenants', 'Tenant management')
    .addTag('apps', 'Application management')
    .addTag('configs', 'Configuration management')
    .addTag('prompts', 'Prompt management')
    .addTag('widget', 'Widget session management')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get('PORT', 3001);
  await app.listen(port);

  console.log(`🚀 Kuzushi Backend running on http://localhost:${port}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${port}/ws`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/v1/docs`);
}

bootstrap();
