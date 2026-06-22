import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GraphService {
  constructor(private prisma: PrismaService) {}

  async getGraphData(userId: string) {
    // 1. Fetch all concepts extracted from this user's documents
    const concepts = await this.prisma.concept.findMany({
      where: {
        document: { userId },
      },
      include: {
        document: {
          select: { name: true },
        },
      },
    });

    const conceptIds = concepts.map(c => c.id);

    // 2. Fetch all relationships linking these concepts
    const relationships = await this.prisma.conceptRelationship.findMany({
      where: {
        OR: [
          { fromId: { in: conceptIds } },
          { toId: { in: conceptIds } },
        ],
      },
    });

    // 3. Format into D3 compatible format
    const nodes = concepts.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      documentName: c.document.name,
      documentId: c.documentId,
    }));

    // Filter links to ensure both source and target exist in this user's concept nodes list
    const nodeIdsSet = new Set(conceptIds);
    const links = relationships
      .filter(r => nodeIdsSet.has(r.fromId) && nodeIdsSet.has(r.toId))
      .map(r => ({
        source: r.fromId,
        target: r.toId,
        type: r.type,
      }));

    return { nodes, links };
  }
}
