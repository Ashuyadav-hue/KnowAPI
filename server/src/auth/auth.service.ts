import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
      },
    });

    const token = this.signToken(user.id, user.email);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.signToken(user.id, user.email);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, name?: string, avatarUrl?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name,
        avatarUrl,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });
  }

  // --- API Key Management ---
  async getKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createKey(userId: string, name: string) {
    const randomHex = crypto.randomUUID().replace(/-/g, '');
    const key = `sk_live_${randomHex}`;
    
    return this.prisma.apiKey.create({
      data: {
        name: name || 'API Key',
        key,
        userId,
      },
    });
  }

  async deleteKey(userId: string, keyId: string) {
    const keyRecord = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!keyRecord) {
      throw new NotFoundException('API key not found');
    }

    return this.prisma.apiKey.delete({
      where: { id: keyId },
    });
  }

  async googleLogin(email: string, name: string, avatarUrl?: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(Math.random().toString(), 10);
      user = await this.prisma.user.create({
        data: {
          email,
          password: passwordHash,
          name: name || email.split('@')[0],
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
      });
    }

    const token = this.signToken(user.id, user.email);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  private signToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}
