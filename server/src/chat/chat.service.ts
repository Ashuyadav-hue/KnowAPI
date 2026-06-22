import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VectorService } from '../common/vector.service';
import { GeminiService } from '../common/gemini.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private vector: VectorService,
    private gemini: GeminiService
  ) {}

  async createSession(title: string, userId: string) {
    return this.prisma.chatSession.create({
      data: {
        title,
        userId,
      },
    });
  }

  async getSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getSessionWithMessages(sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return session;
  }

  async deleteSession(sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return this.prisma.chatSession.delete({
      where: { id: sessionId },
    });
  }

  async sendMessage(sessionId: string, content: string, userId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    // 1. Save user message
    await this.prisma.chatMessage.create({
      data: {
        role: 'user',
        content,
        sessionId,
      },
    });

    // Update session update time
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // 2. Perform semantic search to retrieve relevant context
    // First, embed the user query
    const queryVector = await this.gemini.generateEmbedding(content);
    
    // Search top 5 chunks
    const matches = await this.vector.search(queryVector, 5);
    
    // Filter matches that belong to the user (VectorService search returns userId in payload)
    const userMatches = matches.filter(m => m.payload?.userId === userId);
    
    const contextText = userMatches
      .map((m, idx) => `[Source ${idx + 1}: ${m.payload?.text || ''}]`)
      .join('\n\n');

    // Build references/citations array
    const citations = userMatches.map(m => {
      // Get document name from DB if available
      return {
        chunkId: m.id,
        text: m.payload?.text || '',
        documentId: m.payload?.documentId,
      };
    });

    // Resolve document names to show nice UI citations
    const docIds = [...new Set(citations.map(c => c.documentId).filter(Boolean))];
    const docs = await this.prisma.document.findMany({
      where: { id: { in: docIds as string[] } },
      select: { id: true, name: true },
    });
    const docMap = new Map(docs.map(d => [d.id, d.name]));

    const finalizedCitations = citations.map(c => ({
      fileName: docMap.get(c.documentId || '') || 'Unknown Document',
      text: c.text,
    }));

    // 3. Prompt Gemini with context
    const systemPrompt = `
You are an intelligent knowledge assistant. Answer the user's question based strictly on the provided document context.
If the answer cannot be found in the context, politely state that you do not know or that it isn't in your knowledge base. 
Do not make up facts or use general knowledge that isn't supported by the context.

Provided Context:
${contextText || 'No documents uploaded yet.'}

User Question: ${content}
`;

    const assistantReply = await this.gemini.generateCompletion(systemPrompt, false);

    // 4. Save assistant message
    const botMessage = await this.prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: assistantReply,
        citations: JSON.stringify(finalizedCitations),
        sessionId,
      },
    });

    return botMessage;
  }
}
