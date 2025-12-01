import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppDto, UpdateAppDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AppManagementService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAppDto) {
    // Check if slug or projectId already exists
    const existing = await this.prisma.app.findFirst({
      where: {
        OR: [{ slug: dto.slug }, { projectId: dto.projectId }],
      },
    });

    if (existing) {
      throw new ConflictException('App with this slug or projectId already exists');
    }

    // Generate API key
    const apiKey = this.generateApiKey();

    return this.prisma.app.create({
      data: {
        ...dto,
        apiKey,
      },
    });
  }

  async findAll() {
    return this.prisma.app.findMany({
      include: {
        tenant: true,
        _count: {
          select: {
            configs: true,
            sessions: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.app.findUnique({
      where: { id },
      include: {
        tenant: true,
        configs: {
          orderBy: { version: 'desc' },
        },
        promptProfiles: true,
      },
    });
  }

  async update(id: string, dto: UpdateAppDto) {
    return this.prisma.app.update({
      where: { id },
      data: dto,
    });
  }

  private generateApiKey(): string {
    return `sk_${randomBytes(32).toString('hex')}`;
  }
}
