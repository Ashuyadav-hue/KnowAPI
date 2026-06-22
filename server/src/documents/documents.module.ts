import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PipelineService } from './pipeline.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, PipelineService],
  exports: [DocumentsService, PipelineService],
})
export class DocumentsModule {}
