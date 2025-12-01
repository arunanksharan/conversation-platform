import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PromptService } from './prompt.service';
import { CreatePromptDto } from './dto';

@ApiTags('prompts')
@Controller('v1/apps/:appId/prompts')
export class PromptController {
  constructor(private promptService: PromptService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new prompt for an app' })
  @ApiParam({ name: 'appId', description: 'App UUID' })
  @ApiResponse({ status: 201, description: 'Prompt created successfully' })
  @ApiResponse({ status: 404, description: 'App not found' })
  async create(@Param('appId') appId: string, @Body() dto: CreatePromptDto) {
    return this.promptService.create(appId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all prompts for an app' })
  @ApiParam({ name: 'appId', description: 'App UUID' })
  @ApiResponse({ status: 200, description: 'Returns list of prompts for the app' })
  @ApiResponse({ status: 404, description: 'App not found' })
  async findAll(@Param('appId') appId: string) {
    return this.promptService.findAll(appId);
  }
}
