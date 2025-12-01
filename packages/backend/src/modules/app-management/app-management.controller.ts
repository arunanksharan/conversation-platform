import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AppManagementService } from './app-management.service';
import { CreateAppDto, UpdateAppDto } from './dto';

@ApiTags('apps')
@Controller('v1/apps')
export class AppManagementController {
  constructor(private appService: AppManagementService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new app' })
  @ApiResponse({ status: 201, description: 'App created successfully' })
  async create(@Body() dto: CreateAppDto) {
    return this.appService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all apps' })
  @ApiResponse({ status: 200, description: 'Returns list of all apps' })
  async findAll() {
    return this.appService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an app by ID' })
  @ApiParam({ name: 'id', description: 'App UUID' })
  @ApiResponse({ status: 200, description: 'Returns the app' })
  @ApiResponse({ status: 404, description: 'App not found' })
  async findOne(@Param('id') id: string) {
    return this.appService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an app' })
  @ApiParam({ name: 'id', description: 'App UUID' })
  @ApiResponse({ status: 200, description: 'App updated successfully' })
  @ApiResponse({ status: 404, description: 'App not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateAppDto) {
    return this.appService.update(id, dto);
  }
}
