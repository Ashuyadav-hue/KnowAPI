import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getSystemStatus() {
    return {
      status: 'online',
      message: 'KnowledgeAPI Backend is fully operational',
      version: '1.0.0',
      database: 'SQLite',
      timestamp: new Date().toISOString(),
    };
  }
}
