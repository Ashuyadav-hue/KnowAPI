import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { StorageService } from './storage.service';
import { QueueService } from './queue.service';
import { VectorService } from './vector.service';
import { GeminiService } from './gemini.service';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    PrismaService,
    StorageService,
    QueueService,
    VectorService,
    GeminiService,
  ],
  exports: [
    PrismaService,
    StorageService,
    QueueService,
    VectorService,
    GeminiService,
  ],
})
export class CommonModule {}
