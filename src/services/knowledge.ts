import type { PrismaClient } from '@prisma/client';
import type { AiClient } from './gemini';

export interface KnowledgeSearchResult {
  id: string;
  documentId: string;
  title: string;
  content: string;
  similarity: number;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.map((value) => Number(value).toFixed(8)).join(',')}]`;
}

export function chunkText(text: string, maxChars = 900): string[] {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const block of blocks) {
    if (!current) {
      current = block;
      continue;
    }

    if (`${current}\n\n${block}`.length <= maxChars) {
      current = `${current}\n\n${block}`;
    } else {
      chunks.push(current);
      current = block;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.flatMap((chunk) => {
    if (chunk.length <= maxChars) {
      return [chunk];
    }

    const pieces: string[] = [];
    for (let index = 0; index < chunk.length; index += maxChars) {
      pieces.push(chunk.slice(index, index + maxChars));
    }
    return pieces;
  });
}

export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ai: AiClient
  ) {}

  async createKnowledge(args: {
    businessId: string;
    title: string;
    body: string;
    source?: 'MANUAL' | 'FAQ_SUGGESTION' | 'CHAT_DRAFT';
    status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'ARCHIVED';
    internalNotes?: string;
  }) {
    const document = await this.prisma.knowledgeDocument.create({
      data: {
        businessId: args.businessId,
        title: args.title,
        body: args.body,
        source: args.source ?? 'MANUAL',
        status: args.status ?? 'PENDING',
        internalNotes: args.internalNotes
      }
    });

    if (document.status === 'APPROVED') {
      await this.reindexDocument(document.id);
    }

    return document;
  }

  async approveKnowledge(documentId: string, adminUserId?: string) {
    const document = await this.prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedByAdminId: adminUserId
      }
    });

    await this.reindexDocument(document.id);
    return document;
  }

  async reindexApprovedKnowledge(businessId: string): Promise<number> {
    const documents = await this.prisma.knowledgeDocument.findMany({
      where: {
        businessId,
        status: 'APPROVED'
      }
    });

    for (const document of documents) {
      await this.reindexDocument(document.id);
    }

    return documents.length;
  }

  async reindexDocument(documentId: string): Promise<number> {
    const document = await this.prisma.knowledgeDocument.findUniqueOrThrow({
      where: { id: documentId }
    });
    const chunks = chunkText(`${document.title}\n\n${document.body}`);

    await this.prisma.knowledgeChunk.deleteMany({
      where: { documentId }
    });

    for (const [index, content] of chunks.entries()) {
      const embedding = await this.ai.createEmbedding(content);
      const vector = toVectorLiteral(embedding);

      await this.prisma.$executeRaw`
        INSERT INTO knowledge_chunks (business_id, document_id, content, embedding, metadata)
        VALUES (
          ${document.businessId}::uuid,
          ${document.id}::uuid,
          ${content},
          ${vector}::vector,
          ${JSON.stringify({ chunkIndex: index })}::jsonb
        )
      `;
    }

    return chunks.length;
  }

  async search(args: {
    businessId: string;
    query: string;
    limit?: number;
    minSimilarity?: number;
  }): Promise<KnowledgeSearchResult[]> {
    const embedding = await this.ai.createEmbedding(args.query);
    if (!embedding.length) {
      return [];
    }

    const vector = toVectorLiteral(embedding);
    const limit = args.limit ?? 5;
    const minSimilarity = args.minSimilarity ?? 0.72;

    const rows = await this.prisma.$queryRaw<KnowledgeSearchResult[]>`
      SELECT
        kc.id,
        kc.document_id AS "documentId",
        kd.title,
        kc.content,
        1 - (kc.embedding <=> ${vector}::vector) AS similarity
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kd.id = kc.document_id
      WHERE kc.business_id = ${args.businessId}::uuid
        AND kd.status = 'APPROVED'
        AND kc.embedding IS NOT NULL
      ORDER BY kc.embedding <=> ${vector}::vector
      LIMIT ${limit}
    `;

    return rows.filter((row) => Number(row.similarity) >= minSimilarity);
  }
}
