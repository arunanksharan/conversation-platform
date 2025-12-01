import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromptDto } from './dto';

@Injectable()
export class PromptService {
  constructor(private prisma: PrismaService) {}

  async create(appId: string, dto: CreatePromptDto) {
    // If this should be default, unset other defaults of same kind
    if (dto.isDefault) {
      await this.prisma.promptProfile.updateMany({
        where: { appId, kind: dto.kind, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.promptProfile.create({
      data: {
        appId,
        ...dto,
      },
    });
  }

  async findAll(appId: string) {
    return this.prisma.promptProfile.findMany({
      where: { appId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
