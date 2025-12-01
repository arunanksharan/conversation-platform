import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ConfigManagementService } from './config-management.service';
import { CreateConfigDto } from './dto';

@ApiTags('configs')
@Controller('v1/apps/:appId/configs')
export class ConfigManagementController {
  constructor(private configService: ConfigManagementService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new config version for an app' })
  @ApiParam({ name: 'appId', description: 'App UUID' })
  @ApiResponse({ status: 201, description: 'Config created successfully' })
  @ApiResponse({ status: 404, description: 'App not found' })
  async create(@Param('appId') appId: string, @Body() dto: CreateConfigDto) {
    return this.configService.create(appId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all config versions for an app' })
  @ApiParam({ name: 'appId', description: 'App UUID' })
  @ApiResponse({ status: 200, description: 'Returns list of configs for the app' })
  @ApiResponse({ status: 404, description: 'App not found' })
  async findAll(@Param('appId') appId: string) {
    return this.configService.findAll(appId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the active config for an app' })
  @ApiParam({ name: 'appId', description: 'App UUID' })
  @ApiResponse({ status: 200, description: 'Returns the active config' })
  @ApiResponse({ status: 404, description: 'App or active config not found' })
  async findActive(@Param('appId') appId: string) {
    return this.configService.findActive(appId);
  }
}
