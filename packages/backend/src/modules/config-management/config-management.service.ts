import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConfigDto } from './dto';

@Injectable()
export class ConfigManagementService {
  constructor(private prisma: PrismaService) {}

  async create(appId: string, dto: CreateConfigDto) {
    // Get latest version
    const latestConfig = await this.prisma.appConfig.findFirst({
      where: { appId },
      orderBy: { version: 'desc' },
    });

    const newVersion = latestConfig ? latestConfig.version + 1 : 1;

    // Deactivate old configs if this one should be active
    if (dto.isActive) {
      await this.prisma.appConfig.updateMany({
        where: { appId, isActive: true },
        data: { isActive: false },
      });
    }

    return this.prisma.appConfig.create({
      data: {
        appId,
        version: newVersion,
        ...dto,
      },
    });
  }

  async findAll(appId: string) {
    return this.prisma.appConfig.findMany({
      where: { appId },
      orderBy: { version: 'desc' },
    });
  }

  async findActive(appId: string) {
    return this.prisma.appConfig.findFirst({
      where: { appId, isActive: true },
      orderBy: { version: 'desc' },
    });
  }
}
