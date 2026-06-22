import {
  Controller,
  Get,
  Post,
  All,
  Param,
  Body,
  UseGuards,
  Request,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApisService } from './apis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';

@Controller('apis')
export class ApisController {
  constructor(
    private apisService: ApisService,
    private prisma: PrismaService
  ) {}

  // JWT Protected Dashboard Routes
  @UseGuards(JwtAuthGuard)
  @Get()
  async getEndpoints(@Request() req: any) {
    return this.apisService.listEndpoints(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('logs')
  async getLogs(@Request() req: any) {
    return this.apisService.getLogs(req.user.id);
  }

  // Dashboard testing console endpoint
  @UseGuards(JwtAuthGuard)
  @Post('test/:id')
  async testEndpoint(
    @Param('id') id: string,
    @Request() req: any
  ) {
    // Find endpoint first
    const endpoint = await this.prisma.apiEndpoint.findFirst({
      where: {
        id,
        document: { userId: req.user.id },
      },
    });

    if (!endpoint) {
      throw new UnauthorizedException('Endpoint not found or access denied');
    }

    // Get or create first API key for this user
    let apiKeyRecord = await this.prisma.apiKey.findFirst({
      where: { userId: req.user.id },
    });

    if (!apiKeyRecord) {
      apiKeyRecord = await this.prisma.apiKey.create({
        data: {
          name: 'Default Test Key',
          key: `sk_test_${crypto.randomUUID().replace(/-/g, '')}`,
          userId: req.user.id,
        },
      });
    }

    return this.apisService.executeEndpoint(
      endpoint.path,
      endpoint.method,
      apiKeyRecord.key,
      req.ip
    );
  }

  // PUBLIC API GATEWAY (Uses x-api-key header or key query param)
  @All('gateway/*')
  async handleGateway(
    @Request() req: any,
    @Param() params: any,
    @Headers('x-api-key') headerApiKey: string,
    @Query('key') queryApiKey: string
  ) {
    const apiKey = headerApiKey || queryApiKey;
    if (!apiKey) {
      throw new UnauthorizedException(
        'API Key is required. Provide it in the x-api-key header or as a "key" query parameter.'
      );
    }

    // The wildcard match will be in params[0]
    const wildcardPath = params[0];
    const path = '/' + wildcardPath;

    return this.apisService.executeEndpoint(path, req.method, apiKey, req.ip);
  }
}
