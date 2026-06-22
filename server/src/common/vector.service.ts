import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface VectorPoint {
  id: string;
  vector: number[];
  payload: any;
}

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);
  
  // Qdrant Configuration
  private qdrantUrl: string | null = null;
  private qdrantApiKey: string | null = null;
  private collectionName = 'knowledge_chunks';
  private vectorSize = 768; // Gemini embedding size is typically 768

  // Local Mode Storage
  private isLocalMode = true;
  private localPoints: Map<string, VectorPoint> = new Map();

  constructor(private configService: ConfigService) {
    this.qdrantUrl = this.configService.get<string>('QDRANT_URL') || null;
    this.qdrantApiKey = this.configService.get<string>('QDRANT_API_KEY') || null;

    if (this.qdrantUrl) {
      this.logger.log(`Qdrant URL found: ${this.qdrantUrl}. Attempting Qdrant Production Mode.`);
      this.isLocalMode = false;
      this.initializeQdrantCollection();
    } else {
      this.logger.log('Qdrant URL not specified. Using Local In-Memory Vector Store.');
    }
  }

  private async initializeQdrantCollection() {
    if (!this.qdrantUrl) return;
    try {
      const url = `${this.qdrantUrl}/collections/${this.collectionName}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.qdrantApiKey) {
        headers['api-key'] = this.qdrantApiKey;
      }

      // Check if collection exists
      const checkRes = await fetch(url, { headers });
      if (checkRes.status === 404) {
        this.logger.log(`Creating Qdrant collection: ${this.collectionName}`);
        const createRes = await fetch(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            vectors: {
              size: this.vectorSize,
              distance: 'Cosine',
            },
          }),
        });
        if (!createRes.ok) {
          const errMsg = await createRes.text();
          throw new Error(`Failed to create collection: ${errMsg}`);
        }
      }
    } catch (err) {
      this.logger.error(`Qdrant initialization error: ${err.message}. Falling back to Local Memory Vector Store.`);
      this.isLocalMode = true;
    }
  }

  async upsertVectors(points: Array<{ id: string; vector: number[]; payload: any }>): Promise<void> {
    if (this.isLocalMode) {
      this.logger.log(`Upserting ${points.length} vectors to Local In-Memory Store.`);
      for (const p of points) {
        this.localPoints.set(p.id, p);
      }
      return;
    }

    // Qdrant upsert
    try {
      const url = `${this.qdrantUrl}/collections/${this.collectionName}/points`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.qdrantApiKey) {
        headers['api-key'] = this.qdrantApiKey;
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          points: points.map(p => ({
            id: p.id,
            vector: p.vector,
            payload: p.payload,
          })),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      this.logger.log(`Successfully upserted ${points.length} vectors to Qdrant.`);
    } catch (err) {
      this.logger.error(`Qdrant upsert failed: ${err.message}. Saving to local fallback.`);
      // Local fallback
      for (const p of points) {
        this.localPoints.set(p.id, p);
      }
    }
  }

  async search(queryVector: number[], limit = 5): Promise<Array<{ id: string; score: number; payload: any }>> {
    if (this.isLocalMode) {
      this.logger.log(`Searching vectors locally (cosine similarity). Count: ${this.localPoints.size}`);
      const results: Array<{ id: string; score: number; payload: any }> = [];

      for (const point of this.localPoints.values()) {
        const score = this.cosineSimilarity(queryVector, point.vector);
        results.push({
          id: point.id,
          score,
          payload: point.payload,
        });
      }

      // Sort by score descending
      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    }

    // Qdrant search
    try {
      const url = `${this.qdrantUrl}/collections/${this.collectionName}/points/search`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.qdrantApiKey) {
        headers['api-key'] = this.qdrantApiKey;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vector: queryVector,
          limit,
          with_payload: true,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const data = await res.json();
      return (data.result || []).map((r: any) => ({
        id: r.id,
        score: r.score,
        payload: r.payload,
      }));
    } catch (err) {
      this.logger.error(`Qdrant search failed: ${err.message}. Searching local memory fallback.`);
      // Fallback search
      const results: Array<{ id: string; score: number; payload: any }> = [];
      for (const point of this.localPoints.values()) {
        const score = this.cosineSimilarity(queryVector, point.vector);
        results.push({
          id: point.id,
          score,
          payload: point.payload,
        });
      }
      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    }
  }

  async deleteVectors(ids: string[]): Promise<void> {
    if (this.isLocalMode) {
      for (const id of ids) {
        this.localPoints.delete(id);
      }
      return;
    }

    // Qdrant delete
    try {
      const url = `${this.qdrantUrl}/collections/${this.collectionName}/points/delete`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.qdrantApiKey) {
        headers['api-key'] = this.qdrantApiKey;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          points: ids,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
    } catch (err) {
      this.logger.error(`Qdrant delete failed: ${err.message}`);
      for (const id of ids) {
        this.localPoints.delete(id);
      }
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
