import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('sessions')
  async createSession(@Body('title') title: string, @Request() req: any) {
    const sessionTitle = title || `New Chat Session ${new Date().toLocaleDateString()}`;
    return this.chatService.createSession(sessionTitle, req.user.id);
  }

  @Get('sessions')
  async getSessions(@Request() req: any) {
    return this.chatService.getSessions(req.user.id);
  }

  @Get('sessions/:id')
  async getSession(@Param('id') id: string, @Request() req: any) {
    return this.chatService.getSessionWithMessages(id, req.user.id);
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id') id: string, @Request() req: any) {
    await this.chatService.deleteSession(id, req.user.id);
    return { success: true };
  }

  @Post('sessions/:id/message')
  async sendMessage(
    @Param('id') sessionId: string,
    @Body('message') message: string,
    @Request() req: any
  ) {
    return this.chatService.sendMessage(sessionId, message, req.user.id);
  }
}
