import { Module } from '@nestjs/common';
import { AppManagementController } from './app-management.controller';
import { AppManagementService } from './app-management.service';

@Module({
  controllers: [AppManagementController],
  providers: [AppManagementService],
  exports: [AppManagementService],
})
export class AppManagementModule {}
