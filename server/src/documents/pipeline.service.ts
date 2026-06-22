import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../common/storage.service';
import { VectorService } from '../common/vector.service';
import { QueueService } from '../common/queue.service';
import { GeminiService } from '../common/gemini.service';
import * as pdf from 'pdf-parse';
import * as mammoth from 'mammoth';

interface ExtractedConcept {
  name: string;
  description: string;
  parentConcept?: string;
}

interface ExtractedFAQ {
  question: string;
  answer: string;
}

interface ExtractedEndpoint {
  path: string;
  method: string;
  description: string;
  responseSchema: any;
}

interface ExtractionResult {
  summary: string;
  tags: string[];
  concepts: ExtractedConcept[];
  faqs: ExtractedFAQ[];
  endpoints: ExtractedEndpoint[];
}

@Injectable()
export class PipelineService implements OnModuleInit {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private vector: VectorService,
    private queue: QueueService,
    private gemini: GeminiService
  ) {}

  onModuleInit() {
    // Register document processing handler
    this.queue.registerHandler('process-document', async (data: { documentId: string; userId: string }) => {
      await this.processDocument(data.documentId, data.userId);
    });
  }

  async processDocument(documentId: string, userId: string) {
    this.logger.log(`Starting processing pipeline for document: ${documentId}`);
    
    // Update status to PROCESSING
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING', error: null },
    });

    try {
      const doc = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!doc) {
        throw new Error('Document record not found');
      }

      // Read file buffer
      const buffer = await this.storage.readFile(doc.path);
      
      // 1. Text Extraction
      let text = '';
      if (doc.mimeType === 'application/pdf') {
        this.logger.log('Extracting text from PDF...');
        const parsed = await (pdf as any)(buffer);
        text = parsed.text;
      } else if (
        doc.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        doc.name.endsWith('.docx')
      ) {
        this.logger.log('Extracting text from Word document...');
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else {
        // Text, Markdown, etc.
        this.logger.log('Extracting text as UTF-8 string...');
        text = buffer.toString('utf-8');
      }

      text = text.trim();
      if (!text) {
        throw new Error('No readable text could be extracted from this document.');
      }

      this.logger.log(`Extracted ${text.length} characters of text.`);

      // 2. Chunking Content
      this.logger.log('Chunking text content...');
      const chunks = this.chunkText(text, 1000, 150);
      this.logger.log(`Created ${chunks.length} chunks.`);

      // 3. Generate Embeddings & Store in Vector DB
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'EMBEDDING' },
      });

      const vectorPoints: any[] = [];
      const dbChunksData: any[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        this.logger.log(`Embedding chunk ${i + 1}/${chunks.length}...`);
        
        // Generate embedding vector
        const vector = await this.gemini.generateEmbedding(chunkText);
        
        // Temporary chunk ID for linking database and vector store
        const chunkId = crypto.randomUUID();

        dbChunksData.push({
          id: chunkId,
          content: chunkText,
          documentId,
        });

        vectorPoints.push({
          id: chunkId,
          vector,
          payload: {
            chunkId,
            documentId,
            userId,
            text: chunkText,
          },
        });
      }

      // Bulk insert chunks into DB
      await this.prisma.documentChunk.createMany({
        data: dbChunksData,
      });

      // Upsert vectors to vector DB (memory or Qdrant)
      await this.vector.upsertVectors(vectorPoints);

      // Save vector reference IDs back to chunks in the DB (for trace/delete logic)
      for (const point of vectorPoints) {
        await this.prisma.documentChunk.update({
          where: { id: point.id },
          data: { vectorId: point.id },
        });
      }

      // 4. Generate Summaries, Concepts, FAQs, APIs using Gemini
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'GENERATING_APIS' },
      });

      this.logger.log('Querying Gemini to extract document structure, summary, FAQs, and APIs...');
      
      // To keep prompt sizes manageable, we take a representative summary sample if text is extremely long, 
      // or we send the full text if it's moderate.
      const textSample = text.length > 20000 
        ? `${text.substring(0, 10000)}\n\n[...]\n\n${text.substring(text.length - 10000)}` 
        : text;

      const prompt = `
You are an expert knowledge analysis system. Analyze the following document content and extract rich structuring data in JSON.

Document Name: ${doc.name}
Document Content:
${textSample}

Return a valid JSON object matching this schema:
{
  "summary": "A detailed 3-4 sentence paragraph summarizing the core information contained in this document.",
  "tags": ["Tag1", "Tag2"],
  "concepts": [
    {
      "name": "Concept Name",
      "description": "Short explanation of the concept.",
      "parentConcept": "Name of the parent concept if this concept belongs under another concept extracted, else null."
    }
  ],
  "faqs": [
    {
      "question": "A logical question a developer/student would ask about the document content.",
      "answer": "A clear, detailed answer quoting or summarizing information from the text."
    }
  ],
  "endpoints": [
    {
      "path": "/logical-path/sub-path",
      "method": "GET",
      "description": "What this endpoint returns (e.g. 'Retrieve syntax and definitions of Hook X'). Make the path lowercased, kebab-cased, starting with a slash, representing the specific subtopic of the document.",
      "responseSchema": {
        "field1": "type description",
        "field2": "type description"
      }
    }
  ]
}

Please ensure:
- Extract 3 to 6 major concepts. Establish hierarchy using "parentConcept" (e.g., if you extract "React Hooks" and "useState", "useState"'s parentConcept should be "React Hooks").
- Create 3 to 6 high-value FAQs.
- Create 2 to 4 REST API endpoints mapping to specific sub-sections or tables of the document. Each endpoint must have a descriptive path and a clean JSON schema describing what it represents.
`;

      const aiResponseText = await this.gemini.generateCompletion(prompt, true);
      const aiResult: ExtractionResult = JSON.parse(aiResponseText);

      this.logger.log('Gemini processing complete. Saving results...');

      // Save summary and tags to document
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          summary: aiResult.summary,
          tags: aiResult.tags ? aiResult.tags.join(',') : '',
        },
      });

      // Save FAQs
      if (aiResult.faqs && aiResult.faqs.length > 0) {
        await this.prisma.fAQ.createMany({
          data: aiResult.faqs.map(f => ({
            question: f.question,
            answer: f.answer,
            documentId,
          })),
        });
      }

      // Save API Endpoints
      if (aiResult.endpoints && aiResult.endpoints.length > 0) {
        for (const ep of aiResult.endpoints) {
          // Normalize endpoint path (ensure leading slash, no api prefix - gateway handles that)
          let cleanPath = ep.path.toLowerCase().trim();
          if (!cleanPath.startsWith('/')) {
            cleanPath = '/' + cleanPath;
          }

          await this.prisma.apiEndpoint.create({
            data: {
              path: cleanPath,
              method: ep.method || 'GET',
              description: ep.description,
              responseSchema: JSON.stringify(ep.responseSchema || {}),
              documentId,
            },
          });
        }
      }

      // Save Concepts and build Relationships
      if (aiResult.concepts && aiResult.concepts.length > 0) {
        const createdConceptsMap = new Map<string, string>(); // name -> DB id

        for (const c of aiResult.concepts) {
          const conceptDb = await this.prisma.concept.create({
            data: {
              name: c.name,
              description: c.description,
              documentId,
            },
          });
          createdConceptsMap.set(c.name.toLowerCase().trim(), conceptDb.id);
        }

        // Build parent-child relationships
        for (const c of aiResult.concepts) {
          if (c.parentConcept) {
            const childId = createdConceptsMap.get(c.name.toLowerCase().trim());
            const parentId = createdConceptsMap.get(c.parentConcept.toLowerCase().trim());

            if (childId && parentId) {
              await this.prisma.conceptRelationship.create({
                data: {
                  fromId: parentId, // Parent points to child
                  toId: childId,
                  type: 'parent-child',
                },
              });
            }
          }
        }
      }

      // Update status to COMPLETED
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'COMPLETED' },
      });

      this.logger.log(`Document ${documentId} processed successfully!`);
    } catch (err) {
      this.logger.error(`Error in processing pipeline: ${err.message}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', error: err.message },
      }).catch(dbErr => this.logger.error(`Failed to save pipeline error: ${dbErr.message}`));
    }
  }

  /**
   * Splitting algorithm that splits text recursively by double newlines, single newlines, space, and characters
   */
  private chunkText(text: string, maxChunkSize = 1000, overlap = 150): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + maxChunkSize;
      if (end >= text.length) {
        chunks.push(text.substring(start).trim());
        break;
      }

      // Attempt to find a clean break in the current window (double newline, single newline, or space)
      const window = text.substring(start, end);
      let breakIndex = window.lastIndexOf('\n\n');
      if (breakIndex === -1 || breakIndex < maxChunkSize / 2) {
        breakIndex = window.lastIndexOf('\n');
      }
      if (breakIndex === -1 || breakIndex < maxChunkSize / 2) {
        breakIndex = window.lastIndexOf(' ');
      }

      // If we found a clean split, use it
      if (breakIndex !== -1 && breakIndex > 0) {
        end = start + breakIndex;
      }

      chunks.push(text.substring(start, end).trim());
      // Advance by end minus overlap
      start = end - overlap;
      if (start >= text.length - overlap) {
        // Prevent near-empty final chunks
        break;
      }
    }

    return chunks.filter(c => c.length > 0);
  }
}
