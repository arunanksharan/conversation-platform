import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy and database is connected',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-11-24T08:00:00.000Z',
        database: 'connected',
        service: 'kuzushi-backend',
      },
    },
  })
  async getHealth() {
    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        service: 'kuzushi-backend',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        service: 'kuzushi-backend',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes/Docker' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept requests',
    schema: {
      example: {
        status: 'ready',
        timestamp: '2025-11-24T08:00:00.000Z',
        database: 'connected',
        checks: {
          database: 'ok',
          schema: 'ok',
          tenants: 2,
        },
      },
    },
  })
  async getReadiness() {
    // More thorough readiness check
    try {
      // Check if we can query database
      await this.prisma.$queryRaw`SELECT 1`;

      // Check if tables exist
      const tenantCount = await this.prisma.tenant.count();

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: 'connected',
        checks: {
          database: 'ok',
          schema: 'ok',
          tenants: tenantCount,
        },
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe to check if process is running' })
  @ApiResponse({
    status: 200,
    description: 'Service process is alive',
    schema: {
      example: {
        status: 'alive',
        timestamp: '2025-11-24T08:00:00.000Z',
        uptime: 123.456,
        memory: {
          used: 36,
          total: 39,
        },
      },
    },
  })
  getLiveness() {
    // Simple liveness check - is the process running?
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    };
  }
}
