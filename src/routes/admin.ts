import { FaqSuggestionStatus, HandoffStatus, type PrismaClient } from '@prisma/client';
import type { Queue } from 'bullmq';
import { Router } from 'express';
import { z } from 'zod';
import { DEFAULT_BUSINESS } from '../config/constants';
import type { Env } from '../config/env';
import type { KnowledgeService } from '../services/knowledge';
import type { WhatsAppClient } from '../services/whatsapp';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, notFound } from '../utils/errors';

interface AdminRouterDeps {
  env: Env;
  prisma: PrismaClient;
  knowledge: KnowledgeService;
  whatsapp: WhatsAppClient;
  learningQueue?: Queue;
}

const createKnowledgeSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(2),
  source: z.enum(['MANUAL', 'FAQ_SUGGESTION', 'CHAT_DRAFT']).default('MANUAL'),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED']).default('PENDING'),
  internalNotes: z.string().optional()
});

const patchKnowledgeSchema = createKnowledgeSchema.partial();
const handoffSchema = z.object({
  reason: z.string().min(2).default('admin_requested'),
  active: z.boolean().optional(),
  done: z.boolean().optional(),
  sensitive: z.boolean().optional()
});
const aiToggleSchema = z.object({
  enabled: z.boolean()
});
const adminReplySchema = z
  .object({
    body: z.string().min(1).optional(),
    imageUrl: z.string().url().optional(),
    caption: z.string().optional()
  })
  .refine((data) => data.body || data.imageUrl, {
    message: 'body or imageUrl is required'
  });
const handoffStatusQuerySchema = z.nativeEnum(HandoffStatus).optional();
const faqSuggestionStatusQuerySchema = z.nativeEnum(FaqSuggestionStatus).optional();
const mediaSchema = z.object({
  key: z.string().min(2),
  game: z.string().optional(),
  title: z.string().min(2),
  caption: z.string().optional(),
  imageUrl: z.string().url().nullable().optional(),
  aliases: z.array(z.string().min(1)).default([]),
  isActive: z.boolean().default(true)
});
const patchMediaSchema = mediaSchema.partial();
const settingsSchema = z.object({
  businessName: z.string().optional(),
  defaultLanguage: z.string().optional(),
  agentTone: z.string().optional(),
  aiEnabled: z.boolean().optional(),
  autoReplyEnabled: z.boolean().optional(),
  cooldownSeconds: z.number().int().min(20).max(40).optional(),
  maxMessagesContext: z.number().int().min(4).max(20).optional(),
  businessTonePrompt: z.string().optional(),
  gamesServicesKnowledge: z.string().optional(),
  humanHandoffEnabled: z.boolean().optional(),
  ignoreStickers: z.boolean().optional(),
  groupRepliesEnabled: z.boolean().optional(),
  groupPromoEnabled: z.boolean().optional(),
  groupPromoIntervalMinutes: z.number().int().min(0).max(1440).optional(),
  secureFormUrl: z.string().url().optional(),
  adminNotificationNumber: z.string().optional(),
  paymentMethods: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0)
      })
    )
    .optional()
});

async function getDefaultBusiness(prisma: PrismaClient) {
  return prisma.business.upsert({
    where: { slug: DEFAULT_BUSINESS.slug },
    create: DEFAULT_BUSINESS,
    update: {}
  });
}

function routeId(req: { params: Record<string, string | string[] | undefined> }, name = 'id') {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw badRequest(`Route parameter "${name}" is required`);
  }

  return value;
}

export function createAdminRouter(deps: AdminRouterDeps) {
  const router = Router();

  router.post(
    '/admin/knowledge',
    asyncHandler(async (req, res) => {
      const body = createKnowledgeSchema.parse(req.body);
      const business = await getDefaultBusiness(deps.prisma);
      const document = await deps.knowledge.createKnowledge({
        businessId: business.id,
        ...body
      });

      res.status(201).json(document);
    })
  );

  router.delete(
    '/admin/knowledge/:id',
    asyncHandler(async (req, res) => {
      await deps.prisma.knowledgeDocument.delete({
        where: { id: routeId(req) }
      });
      res.json({ ok: true });
    })
  );

  router.get(
    '/admin/knowledge',
    asyncHandler(async (_req, res) => {
      const business = await getDefaultBusiness(deps.prisma);
      const documents = await deps.prisma.knowledgeDocument.findMany({
        where: { businessId: business.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { chunks: true }
          }
        }
      });

      res.json({ data: documents });
    })
  );

  router.patch(
    '/admin/knowledge/:id',
    asyncHandler(async (req, res) => {
      const body = patchKnowledgeSchema.parse(req.body);
      const id = routeId(req);
      const changesText = Boolean(body.title || body.body);
      const document = await deps.prisma.knowledgeDocument.update({
        where: { id },
        data: {
          ...body,
          ...(changesText
            ? {
                status: body.status ?? 'PENDING',
                approvedAt: null,
                approvedByAdminId: null
              }
            : {})
        }
      });

      if (changesText) {
        await deps.prisma.knowledgeChunk.deleteMany({
          where: { documentId: document.id }
        });
      }

      res.json(document);
    })
  );

  router.post(
    '/admin/knowledge/:id/approve',
    asyncHandler(async (req, res) => {
      const document = await deps.knowledge.approveKnowledge(routeId(req));
      res.json(document);
    })
  );

  router.get(
    '/admin/media',
    asyncHandler(async (_req, res) => {
      const business = await getDefaultBusiness(deps.prisma);
      const items = await deps.prisma.mediaCatalogItem.findMany({
        where: { businessId: business.id },
        orderBy: { key: 'asc' }
      });
      res.json({ data: items });
    })
  );

  router.post(
    '/admin/media',
    asyncHandler(async (req, res) => {
      const body = mediaSchema.parse(req.body);
      const business = await getDefaultBusiness(deps.prisma);
      const item = await deps.prisma.mediaCatalogItem.create({
        data: {
          businessId: business.id,
          ...body
        }
      });
      res.status(201).json(item);
    })
  );

  router.patch(
    '/admin/media/:id',
    asyncHandler(async (req, res) => {
      const body = patchMediaSchema.parse(req.body);
      const item = await deps.prisma.mediaCatalogItem.update({
        where: { id: routeId(req) },
        data: body
      });
      res.json(item);
    })
  );

  router.delete(
    '/admin/media/:id',
    asyncHandler(async (req, res) => {
      await deps.prisma.mediaCatalogItem.delete({
        where: { id: routeId(req) }
      });
      res.json({ ok: true });
    })
  );

  router.post(
    '/admin/media/:id/test-send',
    asyncHandler(async (req, res) => {
      const item = await deps.prisma.mediaCatalogItem.findUnique({
        where: { id: routeId(req) }
      });
      if (!item?.imageUrl) {
        throw badRequest('Media item must have an imageUrl');
      }
      const to =
        typeof req.body?.to === 'string' && req.body.to.trim()
          ? req.body.to.trim()
          : deps.env.ADMIN_NOTIFICATION_NUMBER;
      if (!to) {
        throw badRequest('Admin notification number is not configured');
      }
      const result = await deps.whatsapp.sendImage(to, item.imageUrl, item.caption ?? item.title);
      res.json({ ok: true, result });
    })
  );

  router.post(
    '/admin/knowledge/reindex',
    asyncHandler(async (_req, res) => {
      const business = await getDefaultBusiness(deps.prisma);
      const reindexed = await deps.knowledge.reindexApprovedKnowledge(business.id);
      res.json({ ok: true, reindexed });
    })
  );

  router.get(
    '/admin/conversations',
    asyncHandler(async (req, res) => {
      const business = await getDefaultBusiness(deps.prisma);
      const limit = Math.min(Number(req.query.limit ?? 50), 100);
      const handoffStatus = handoffStatusQuerySchema.parse(req.query.handoffStatus);
      const conversations = await deps.prisma.conversation.findMany({
        where: {
          businessId: business.id,
          ...(handoffStatus ? { handoffStatus } : {})
        },
        orderBy: { lastMessageAt: 'desc' },
        take: limit,
        include: {
          contact: true,
          _count: {
            select: { messages: true }
          }
        }
      });

      res.json({ data: conversations });
    })
  );

  router.get(
    '/admin/conversations/:id/messages',
    asyncHandler(async (req, res) => {
      const id = routeId(req);
      const messages = await deps.prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'asc' }
      });

      res.json({ data: messages });
    })
  );

  router.get(
    '/admin/conversations/:id',
    asyncHandler(async (req, res) => {
      const conversation = await deps.prisma.conversation.findUnique({
        where: { id: routeId(req) },
        include: {
          contact: true,
          messages: {
            orderBy: { createdAt: 'asc' }
          },
          handoffEvents: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });
      if (!conversation) {
        throw notFound('Conversation not found');
      }
      res.json(conversation);
    })
  );

  router.post(
    '/admin/conversations/:id/handoff',
    asyncHandler(async (req, res) => {
      const body = handoffSchema.parse(req.body);
      const id = routeId(req);
      const status = body.done ? 'RESOLVED' : body.active === false ? 'REQUESTED' : 'ACTIVE';
      const conversation = await deps.prisma.conversation.update({
        where: { id },
        data: {
          handoffStatus: status,
          handoffReason: body.reason,
          needsHuman: !body.done,
          isSensitive: body.sensitive ?? undefined
        }
      });

      await deps.prisma.handoffEvent.create({
        data: {
          conversationId: conversation.id,
          type: body.done ? 'RESOLVED' : status === 'ACTIVE' ? 'ACTIVATED' : 'REQUESTED',
          reason: body.reason
        }
      });

      res.json(conversation);
    })
  );

  router.post(
    '/admin/conversations/:id/ai-toggle',
    asyncHandler(async (req, res) => {
      const body = aiToggleSchema.parse(req.body);
      const conversation = await deps.prisma.conversation.update({
        where: { id: routeId(req) },
        data: { aiEnabled: body.enabled }
      });
      res.json(conversation);
    })
  );

  router.post(
    '/admin/conversations/:id/reply',
    asyncHandler(async (req, res) => {
      const body = adminReplySchema.parse(req.body);
      const id = routeId(req);
      const conversation = await deps.prisma.conversation.findUnique({
        where: { id },
        include: { contact: true }
      });

      if (!conversation) {
        throw notFound('Conversation not found');
      }

      const sendResult = body.imageUrl
        ? await deps.whatsapp.sendImage(conversation.contact.waId, body.imageUrl, body.caption)
        : await deps.whatsapp.sendText(conversation.contact.waId, body.body!);

      const message = await deps.prisma.message.create({
        data: {
          conversationId: conversation.id,
          contactId: conversation.contactId,
          direction: 'ADMIN',
          channelMessageId: sendResult.messageId,
          body: body.body ?? body.caption,
          contentType: body.imageUrl ? 'IMAGE' : 'TEXT',
          mediaUrl: body.imageUrl,
          metadata: { provider: 'whatsapp_cloud' }
        }
      });

      await deps.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          handoffStatus: 'ACTIVE',
          lastMessageAt: new Date(),
          unreadCount: 0
        }
      });

      await deps.prisma.handoffEvent.create({
        data: {
          conversationId: conversation.id,
          type: 'ADMIN_REPLY',
          reason: 'admin_replied',
          metadata: { messageId: message.id }
        }
      });

      if (body.body) {
        await deps.learningQueue?.add('admin_reply', {
          conversationId: conversation.id,
          adminMessageId: message.id
        });
      }

      res.status(201).json(message);
    })
  );

  router.get(
    '/admin/faq-suggestions',
    asyncHandler(async (req, res) => {
      const business = await getDefaultBusiness(deps.prisma);
      const status = faqSuggestionStatusQuerySchema.parse(req.query.status);
      const suggestions = await deps.prisma.faqSuggestion.findMany({
        where: {
          businessId: business.id,
          ...(status ? { status } : {})
        },
        orderBy: { updatedAt: 'desc' }
      });

      res.json({ data: suggestions });
    })
  );

  router.get(
    '/admin/settings',
    asyncHandler(async (_req, res) => {
      const business = await getDefaultBusiness(deps.prisma);
      const [settings, paymentMethods] = await Promise.all([
        deps.prisma.adminSetting.findMany({ where: { businessId: business.id } }),
        deps.prisma.paymentMethod.findMany({
          where: { businessId: business.id },
          orderBy: { sortOrder: 'asc' }
        })
      ]);
      res.json({ business, settings, paymentMethods });
    })
  );

  router.patch(
    '/admin/settings',
    asyncHandler(async (req, res) => {
      const body = settingsSchema.parse(req.body);
      const business = await getDefaultBusiness(deps.prisma);

      if (body.businessName) {
        await deps.prisma.business.update({
          where: { id: business.id },
          data: { name: body.businessName }
        });
      }

      for (const [key, value] of Object.entries({
        defaultLanguage: body.defaultLanguage,
        agentTone: body.agentTone,
        aiEnabled: body.aiEnabled,
        autoReplyEnabled: body.autoReplyEnabled,
        cooldownSeconds: body.cooldownSeconds,
        maxMessagesContext: body.maxMessagesContext,
        businessTonePrompt: body.businessTonePrompt,
        gamesServicesKnowledge: body.gamesServicesKnowledge,
        humanHandoffEnabled: body.humanHandoffEnabled,
        ignoreStickers: body.ignoreStickers,
        groupRepliesEnabled: body.groupRepliesEnabled,
        groupPromoEnabled: body.groupPromoEnabled,
        groupPromoIntervalMinutes: body.groupPromoIntervalMinutes,
        secureFormUrl: body.secureFormUrl,
        adminNotificationNumber: body.adminNotificationNumber
      })) {
        if (value !== undefined) {
          await deps.prisma.adminSetting.upsert({
            where: {
              businessId_key: {
                businessId: business.id,
                key
              }
            },
            create: {
              businessId: business.id,
              key,
              value
            },
            update: { value }
          });
        }
      }

      if (body.paymentMethods) {
        await deps.prisma.paymentMethod.deleteMany({ where: { businessId: business.id } });
        await deps.prisma.paymentMethod.createMany({
          data: body.paymentMethods.map((method) => ({
            businessId: business.id,
            ...method
          }))
        });
      }

      res.json({ ok: true });
    })
  );

  router.post(
    '/admin/faq-suggestions/:id/approve',
    asyncHandler(async (req, res) => {
      const suggestion = await deps.prisma.faqSuggestion.findUnique({
        where: { id: routeId(req) }
      });
      if (!suggestion) {
        throw notFound('FAQ suggestion not found');
      }
      if (!suggestion.answer.trim()) {
        throw badRequest('FAQ suggestion must have an answer before approval');
      }

      const document = await deps.knowledge.createKnowledge({
        businessId: suggestion.businessId,
        title: suggestion.question,
        body: suggestion.answer,
        source: 'FAQ_SUGGESTION',
        status: 'APPROVED'
      });

      const updated = await deps.prisma.faqSuggestion.update({
        where: { id: suggestion.id },
        data: {
          status: 'APPROVED',
          approvedDocumentId: document.id
        }
      });

      res.json({ suggestion: updated, knowledgeDocument: document });
    })
  );

  router.get(
    '/admin/unresolved',
    asyncHandler(async (_req, res) => {
      const business = await getDefaultBusiness(deps.prisma);
      const conversations = await deps.prisma.conversation.findMany({
        where: {
          businessId: business.id,
          OR: [
            { handoffStatus: 'REQUESTED' },
            { needsHumanPricing: true },
            { needsHumanSales: true },
            { isSensitive: true }
          ]
        },
        include: {
          contact: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { lastMessageAt: 'desc' }
      });

      res.json({ data: conversations });
    })
  );

  router.get(
    '/admin/analytics',
    asyncHandler(async (_req, res) => {
      const business = await getDefaultBusiness(deps.prisma);
      const [
        contacts,
        conversations,
        handoffs,
        sensitive,
        approvedKnowledge,
        pendingFaqSuggestions,
        aiReplies
      ] = await Promise.all([
        deps.prisma.contact.count({ where: { businessId: business.id } }),
        deps.prisma.conversation.count({ where: { businessId: business.id } }),
        deps.prisma.conversation.count({
          where: { businessId: business.id, handoffStatus: { in: ['REQUESTED', 'ACTIVE'] } }
        }),
        deps.prisma.conversation.count({ where: { businessId: business.id, isSensitive: true } }),
        deps.prisma.knowledgeDocument.count({
          where: { businessId: business.id, status: 'APPROVED' }
        }),
        deps.prisma.faqSuggestion.count({
          where: { businessId: business.id, status: 'PENDING' }
        }),
        deps.prisma.message.count({
          where: {
            aiGenerated: true,
            conversation: { businessId: business.id }
          }
        })
      ]);

      const topIntents = await deps.prisma.message.groupBy({
        by: ['intent'],
        where: {
          intent: { not: null },
          conversation: { businessId: business.id }
        },
        _count: { intent: true },
        orderBy: { _count: { intent: 'desc' } },
        take: 10
      });

      res.json({
        totalConversations: conversations,
        contacts,
        conversations,
        aiReplies,
        handoffs,
        humanHandoffs: handoffs,
        sensitive,
        approvedKnowledge,
        unansweredQuestions: pendingFaqSuggestions,
        pendingFaqSuggestions,
        topIntents,
        averageResponseTimeSeconds: null
      });
    })
  );

  return router;
}
