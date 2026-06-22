import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { QueueService } from '../common/queue.service';
import { StorageService } from '../common/storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private storageService: StorageService,
    private queueService: QueueService
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = req.user.id;
    
    // Save file buffer
    const savedPath = await this.storageService.saveFile(
      file.originalname,
      file.buffer
    );

    // Create DB record
    const document = await this.documentsService.create(
      file.originalname,
      savedPath,
      file.size,
      file.mimetype || 'application/octet-stream',
      userId
    );

    // Enqueue background processing job
    await this.queueService.addJob('process-document', {
      documentId: document.id,
      userId,
    });

    return document;
  }

  @Get()
  async getDocuments(@Request() req: any) {
    return this.documentsService.findAll(req.user.id);
  }

  @Get(':id')
  async getDocument(@Param('id') id: string, @Request() req: any) {
    return this.documentsService.findOne(id, req.user.id);
  }

  @Patch(':id/rename')
  async renameDocument(
    @Param('id') id: string,
    @Body('name') name: string,
    @Request() req: any
  ) {
    if (!name) {
      throw new BadRequestException('Name is required');
    }
    return this.documentsService.rename(id, name, req.user.id);
  }

  @Get('search/query')
  async search(
    @Query('query') query: string,
    @Query('type') type: string,
    @Request() req: any
  ) {
    if (!query) {
      throw new BadRequestException('Query parameter is required');
    }
    return this.documentsService.search(query, type, req.user.id);
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string, @Request() req: any) {
    await this.documentsService.remove(id, req.user.id);
    return { success: true, message: 'Document deleted successfully' };
  }
}
