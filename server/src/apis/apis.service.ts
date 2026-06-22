import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GeminiService } from '../common/gemini.service';
import { VectorService } from '../common/vector.service';

@Injectable()
export class ApisService {
  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
    private vector: VectorService
  ) {}

  async listEndpoints(userId: string) {
    return this.prisma.apiEndpoint.findMany({
      where: {
        document: { userId },
      },
      include: {
        document: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLogs(userId: string) {
    return this.prisma.apiLog.findMany({
      where: {
        endpoint: {
          document: { userId },
        },
      },
      include: {
        endpoint: {
          select: { path: true, method: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async executeEndpoint(
    path: string,
    method: string,
    apiKeyString: string,
    ipAddress?: string
  ): Promise<any> {
    const startTime = Date.now();

    // 1. Verify API Key
    const apiKeyRecord = await this.prisma.apiKey.findUnique({
      where: { key: apiKeyString },
      include: { user: true },
    });

    if (!apiKeyRecord) {
      throw new UnauthorizedException('Invalid API Key');
    }

    const userId = apiKeyRecord.userId;

    // 2. Find matching Endpoint for this path and user
    // Normalize path (ensure leading slash, strip query params)
    let cleanPath = path.split('?')[0].toLowerCase().trim();
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }

    // Try to find endpoint
    const endpoint = await this.prisma.apiEndpoint.findFirst({
      where: {
        path: cleanPath,
        method: method.toUpperCase(),
        document: { userId },
      },
      include: {
        document: {
          include: {
            chunks: true,
          },
        },
      },
    });

    if (!endpoint) {
      throw new NotFoundException(`Endpoint '${method} ${cleanPath}' not found for this API Key`);
    }

    let resultJson: any = {};
    let statusCode = 200;

    try {
      // 3. Gather knowledge context
      // Search top chunks in vector store using path name as search query (to get topic-related chunks)
      const queryVector = await this.gemini.generateEmbedding(endpoint.description);
      const matches = await this.vector.search(queryVector, 5);
      const docMatches = matches.filter(
        m => m.payload?.documentId === endpoint.documentId && m.payload?.userId === userId
      );

      let contextText = docMatches.map(m => m.payload?.text).join('\n\n');
      if (!contextText) {
        // Fallback to raw document chunks if vector search doesn't return anything
        contextText = endpoint.document.chunks.map(c => c.content).slice(0, 3).join('\n\n');
      }

      // 4. Instruct Gemini to generate response matching the schema
      const prompt = `
You are the dynamic API gateway handler for endpoint '${endpoint.path}'.
Here is the document context knowledge base:
${contextText}

You must return a JSON response matching the following schema structure:
${endpoint.responseSchema}

Requirements:
- Use only the provided context to answer. If the context does not have enough information, populate fields with sensible empty values (like empty strings or arrays) that fit the data type.
- Output ONLY the raw JSON. Do NOT wrap it in markdown code blocks like \`\`\`json.
`;

      const aiText = await this.gemini.generateCompletion(prompt, true);
      
      try {
        resultJson = JSON.parse(aiText);
      } catch (err) {
        // Clean JSON formatting if Gemini wraps it
        const cleanedText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        resultJson = JSON.parse(cleanedText);
      }
    } catch (err) {
      statusCode = 500;
      resultJson = {
        error: 'API Execution Error',
        message: err.message,
      };
    }

    // 5. Log execution telemetry
    const latencyMs = Date.now() - startTime;
    await this.prisma.apiLog.create({
      data: {
        endpointId: endpoint.id,
        path: cleanPath,
        method: method.toUpperCase(),
        ipAddress: ipAddress || null,
        statusCode,
        latencyMs,
      },
    });

    if (statusCode === 500) {
      throw new BadRequestException(resultJson);
    }

    return resultJson;
  }
}
