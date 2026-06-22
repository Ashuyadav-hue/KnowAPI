import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../common/storage.service';
import { VectorService } from '../common/vector.service';
import { GeminiService } from '../common/gemini.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private vector: VectorService,
    private gemini: GeminiService
  ) {}

  async create(name: string, path: string, size: number, mimeType: string, userId: string) {
    return this.prisma.document.create({
      data: {
        name,
        path,
        size,
        mimeType,
        status: 'UPLOADING',
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
      include: {
        chunks: true,
        faqs: true,
        apiEndpoints: true,
      },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return doc;
  }

  async rename(id: string, newName: string, userId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.document.update({
      where: { id },
      data: { name: newName },
    });
  }

  async remove(id: string, userId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
      include: { chunks: true },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // Delete vectors associated with chunks
    const chunkIds = doc.chunks.map(c => c.id);
    if (chunkIds.length > 0) {
      await this.vector.deleteVectors(chunkIds);
    }

    // Delete file from storage
    await this.storage.deleteFile(doc.path);

    // Delete document record (cascade deletes chunks, faqs, concepts, apiEndpoints via Prisma schema relations)
    return this.prisma.document.delete({
      where: { id },
    });
  }

  async search(query: string, type: string, userId: string) {
    if (type === 'semantic') {
      const queryVector = await this.gemini.generateEmbedding(query);
      const matches = await this.vector.search(queryVector, 10);
      const userMatches = matches.filter(m => m.payload?.userId === userId);

      const docIds = [...new Set(userMatches.map(m => m.payload?.documentId).filter(Boolean))];
      const docs = await this.prisma.document.findMany({
        where: { id: { in: docIds as string[] } },
        select: { id: true, name: true },
      });
      const docMap = new Map(docs.map(d => [d.id, d.name]));

      return userMatches.map(m => ({
        id: m.id,
        content: m.payload?.text || '',
        score: m.score,
        documentId: m.payload?.documentId,
        documentName: docMap.get(m.payload?.documentId || '') || 'Unknown Document',
      }));
    } else {
      // Keyword search
      const chunks = await this.prisma.documentChunk.findMany({
        where: {
          content: { contains: query },
          document: { userId },
        },
        include: {
          document: {
            select: { name: true },
          },
        },
        take: 10,
      });

      return chunks.map(c => ({
        id: c.id,
        content: c.content,
        score: 1.0,
        documentId: c.documentId,
        documentName: c.document.name,
      }));
    }
  }
}
