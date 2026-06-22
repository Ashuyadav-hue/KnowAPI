import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('name') name?: string
  ) {
    return this.authService.register(email, password, name);
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string
  ) {
    return this.authService.login(email, password);
  }

  @Post('google')
  async googleLogin(
    @Body('email') email: string,
    @Body('name') name: string,
    @Body('avatarUrl') avatarUrl?: string
  ) {
    const googleEmail = email || 'google-demo@knowledgeapi.com';
    const googleName = name || 'Google Demo User';
    return this.authService.googleLogin(googleEmail, googleName, avatarUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Request() req: any,
    @Body('name') name?: string,
    @Body('avatarUrl') avatarUrl?: string
  ) {
    return this.authService.updateProfile(req.user.id, name, avatarUrl);
  }

  // API Key Routes
  @UseGuards(JwtAuthGuard)
  @Get('keys')
  async getKeys(@Request() req: any) {
    return this.authService.getKeys(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('keys')
  async createKey(
    @Request() req: any,
    @Body('name') name: string
  ) {
    return this.authService.createKey(req.user.id, name);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('keys/:id')
  async deleteKey(
    @Request() req: any,
    @Param('id') keyId: string
  ) {
    await this.authService.deleteKey(req.user.id, keyId);
    return { success: true };
  }
}
