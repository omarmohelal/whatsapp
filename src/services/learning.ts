import type { PrismaClient } from '@prisma/client';
import type { AiClient } from './gemini';

export class LearningService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ai: AiClient
  ) {}

  async recordUnansweredQuestion(args: { conversationId: string; question: string }) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: args.conversationId }
    });

    if (!conversation) {
      return null;
    }

    return this.prisma.faqSuggestion.create({
      data: {
        businessId: conversation.businessId,
        conversationId: conversation.id,
        question: args.question,
        answer: '',
        status: 'DRAFT'
      }
    });
  }

  async generateFaqSuggestionFromAdminReply(args: {
    conversationId: string;
    adminMessageId: string;
  }) {
    const adminMessage = await this.prisma.message.findUnique({
      where: { id: args.adminMessageId }
    });

    if (!adminMessage?.body) {
      return null;
    }

    const previousInbound = await this.prisma.message.findFirst({
      where: {
        conversationId: args.conversationId,
        direction: 'INBOUND',
        createdAt: {
          lt: adminMessage.createdAt
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!previousInbound?.body) {
      return null;
    }

    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: args.conversationId }
    });

    const normalized = await this.normalizeFaq(previousInbound.body, adminMessage.body);

    return this.prisma.faqSuggestion.create({
      data: {
        businessId: conversation.businessId,
        conversationId: args.conversationId,
        question: normalized.question,
        answer: normalized.answer,
        evidenceMessageIds: [previousInbound.id, adminMessage.id],
        status: 'PENDING'
      }
    });
  }

  private async normalizeFaq(question: string, answer: string) {
    try {
      const response = await this.ai.createChatCompletion([
        {
          role: 'system',
          content:
            'Turn a WhatsApp customer question and successful admin reply into a concise FAQ draft. Return JSON only with "question" and "answer". Keep it in Egyptian Arabic. Do not add prices, stock, or claims not present.'
        },
        {
          role: 'user',
          content: JSON.stringify({ question, answer })
        }
      ]);
      const parsed = JSON.parse(response) as { question?: string; answer?: string };
      return {
        question: parsed.question?.trim() || question,
        answer: parsed.answer?.trim() || answer
      };
    } catch {
      return { question, answer };
    }
  }
}
