import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { ChatModule } from './chat/chat.module';
import { ApisModule } from './apis/apis.module';
import { GraphModule } from './graph/graph.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    DocumentsModule,
    ChatModule,
    ApisModule,
    GraphModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
