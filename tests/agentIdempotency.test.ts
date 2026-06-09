import { AgentService } from '../src/services/agent';
import { env } from '../src/config/env';
import { logger } from '../src/logger';

describe('agent idempotency', () => {
  it('does not send duplicate replies for an existing WhatsApp message id', async () => {
    const prisma = {
      business: { upsert: jest.fn().mockResolvedValue({ id: 'business-id', slug: 'thenexus' }) },
      contact: { upsert: jest.fn().mockResolvedValue({ id: 'contact-id' }) },
      conversation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conversation-id' })
      },
      message: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-message' }),
        create: jest.fn()
      }
    };
    const whatsapp = { sendText: jest.fn(), sendImage: jest.fn() };
    const agent = new AgentService({
      prisma: prisma as never,
      whatsapp,
      knowledge: {} as never,
      mediaCatalog: {} as never,
      ai: {} as never,
      env,
      logger
    });

    await agent.handleIncomingMessage({
      waId: '201000000000',
      messageId: 'wamid.duplicate',
      text: 'السلام عليكم',
      type: 'text',
      raw: {
        id: 'wamid.duplicate',
        from: '201000000000',
        type: 'text',
        text: { body: 'السلام عليكم' }
      }
    });

    expect(whatsapp.sendText).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('does not auto-reply when a human handoff is active', async () => {
    const prisma = {
      business: { upsert: jest.fn().mockResolvedValue({ id: 'business-id', slug: 'thenexus' }) },
      contact: { upsert: jest.fn().mockResolvedValue({ id: 'contact-id' }) },
      conversation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        findUnique: jest.fn().mockResolvedValue({ firstResponseAt: null }),
        update: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'conversation-id',
          handoffStatus: 'ACTIVE',
          aiEnabled: true,
          lastIntent: null,
          detectedGame: null,
          lastAskedQuestion: null,
          pendingFields: null
        })
      },
      message: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'inbound-id' })
      },
      adminSetting: { findMany: jest.fn().mockResolvedValue([]) }
    };
    const whatsapp = { sendText: jest.fn(), sendImage: jest.fn() };
    const mediaCatalog = { listActive: jest.fn() };
    const ai = { createChatCompletion: jest.fn() };
    const agent = new AgentService({
      prisma: prisma as never,
      whatsapp,
      knowledge: {} as never,
      mediaCatalog: mediaCatalog as never,
      ai: ai as never,
      env,
      logger
    });

    await agent.handleIncomingMessage({
      waId: '201000000000',
      messageId: 'wamid.handoff',
      text: 'طرق الدفع',
      type: 'text',
      raw: {
        id: 'wamid.handoff',
        from: '201000000000',
        type: 'text',
        text: { body: 'طرق الدفع' }
      }
    });

    expect(mediaCatalog.listActive).not.toHaveBeenCalled();
    expect(whatsapp.sendText).not.toHaveBeenCalled();
    expect(ai.createChatCompletion).not.toHaveBeenCalled();
  });

  it('continues auto-replying when handoff is only requested but not active', async () => {
    const prisma = {
      business: { upsert: jest.fn().mockResolvedValue({ id: 'business-id', slug: 'thenexus' }) },
      contact: { upsert: jest.fn().mockResolvedValue({ id: 'contact-id' }) },
      conversation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        findUnique: jest.fn().mockResolvedValue({ firstResponseAt: null }),
        update: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'conversation-id',
          handoffStatus: 'REQUESTED',
          aiEnabled: true,
          lastIntent: null,
          detectedGame: null,
          lastAskedQuestion: null,
          pendingFields: null
        })
      },
      message: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn()
          .mockResolvedValueOnce({ id: 'inbound-id', createdAt: new Date('2026-06-09T07:41:44.000Z') })
          .mockResolvedValueOnce({ id: 'outbound-id' })
      },
      adminSetting: { findMany: jest.fn().mockResolvedValue([]) }
    };
    const whatsapp = {
      sendText: jest.fn().mockResolvedValue({ messageId: 'wamid.out' }),
      sendImage: jest.fn()
    };
    const mediaCatalog = { listActive: jest.fn().mockResolvedValue([]) };
    const ai = { createChatCompletion: jest.fn() };
    const agent = new AgentService({
      prisma: prisma as never,
      whatsapp,
      knowledge: {} as never,
      mediaCatalog: mediaCatalog as never,
      ai: ai as never,
      env,
      logger
    });

    await agent.handleIncomingMessage({
      waId: '905377859633',
      messageId: 'wamid.requested',
      text: 'طرق الدفع',
      type: 'text',
      raw: {
        id: 'wamid.requested',
        from: '905377859633',
        type: 'text',
        text: { body: 'طرق الدفع' }
      }
    });

    expect(mediaCatalog.listActive).toHaveBeenCalled();
    expect(whatsapp.sendText).toHaveBeenCalled();
    expect(ai.createChatCompletion).not.toHaveBeenCalled();
  });

  it('stores but ignores low-signal messages instead of calling Gemini', async () => {
    const prisma = {
      business: { upsert: jest.fn().mockResolvedValue({ id: 'business-id', slug: 'thenexus' }) },
      contact: { upsert: jest.fn().mockResolvedValue({ id: 'contact-id' }) },
      conversation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        update: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'conversation-id',
          handoffStatus: 'NONE',
          aiEnabled: true,
          lastIntent: null,
          detectedGame: null,
          lastAskedQuestion: null,
          pendingFields: null
        })
      },
      message: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'inbound-id' })
      },
      adminSetting: { findMany: jest.fn().mockResolvedValue([]) }
    };
    const whatsapp = { sendText: jest.fn(), sendImage: jest.fn() };
    const ai = { createChatCompletion: jest.fn() };
    const agent = new AgentService({
      prisma: prisma as never,
      whatsapp,
      knowledge: {} as never,
      mediaCatalog: { listActive: jest.fn().mockResolvedValue([]) } as never,
      ai: ai as never,
      env,
      logger
    });

    await agent.handleIncomingMessage({
      waId: '201000000000',
      messageId: 'wamid.low-signal',
      text: 'ده',
      type: 'text',
      raw: {
        id: 'wamid.low-signal',
        from: '201000000000',
        type: 'text',
        text: { body: 'ده' }
      }
    });

    expect(whatsapp.sendText).not.toHaveBeenCalled();
    expect(ai.createChatCompletion).not.toHaveBeenCalled();
  });

  it('skips an older inbound message when a newer customer message arrived before reply generation', async () => {
    const inboundCreatedAt = new Date('2026-06-04T10:00:00.000Z');
    const prisma = {
      business: { upsert: jest.fn().mockResolvedValue({ id: 'business-id', slug: 'thenexus' }) },
      contact: { upsert: jest.fn().mockResolvedValue({ id: 'contact-id' }) },
      conversation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        update: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'conversation-id',
          handoffStatus: 'NONE',
          aiEnabled: true,
          lastIntent: null,
          detectedGame: null,
          lastAskedQuestion: null,
          pendingFields: null
        })
      },
      message: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue({
          id: 'newer-inbound-id',
          channelMessageId: 'wamid.newer',
          createdAt: new Date('2026-06-04T10:00:01.000Z')
        }),
        create: jest.fn().mockResolvedValue({ id: 'inbound-id', createdAt: inboundCreatedAt })
      },
      adminSetting: { findMany: jest.fn().mockResolvedValue([{ key: 'replyDebounceSeconds', value: 0 }]) }
    };
    const whatsapp = { sendText: jest.fn(), sendImage: jest.fn() };
    const mediaCatalog = { listActive: jest.fn() };
    const agent = new AgentService({
      prisma: prisma as never,
      whatsapp,
      knowledge: {} as never,
      mediaCatalog: mediaCatalog as never,
      ai: {} as never,
      env,
      logger
    });

    await agent.handleIncomingMessage({
      waId: '201000000000',
      messageId: 'wamid.old',
      text: 'عايز اشحن',
      type: 'text',
      raw: {
        id: 'wamid.old',
        from: '201000000000',
        type: 'text',
        text: { body: 'عايز اشحن' }
      }
    });

    expect(mediaCatalog.listActive).not.toHaveBeenCalled();
    expect(whatsapp.sendText).not.toHaveBeenCalled();
  });

  it('stops non-critical auto replies after the conversation reply budget is exhausted', async () => {
    const prisma = {
      business: { upsert: jest.fn().mockResolvedValue({ id: 'business-id', slug: 'thenexus' }) },
      contact: { upsert: jest.fn().mockResolvedValue({ id: 'contact-id' }) },
      conversation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        update: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'conversation-id',
          handoffStatus: 'NONE',
          aiEnabled: true,
          lastIntent: null,
          detectedGame: null,
          lastAskedQuestion: null,
          pendingFields: null
        })
      },
      message: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        count: jest.fn().mockResolvedValue(8),
        create: jest.fn().mockResolvedValue({ id: 'inbound-id', createdAt: new Date('2026-06-04T10:00:00.000Z') })
      },
      adminSetting: { findMany: jest.fn().mockResolvedValue([]) }
    };
    const whatsapp = { sendText: jest.fn(), sendImage: jest.fn() };
    const agent = new AgentService({
      prisma: prisma as never,
      whatsapp,
      knowledge: {} as never,
      mediaCatalog: { listActive: jest.fn().mockResolvedValue([]) } as never,
      ai: {} as never,
      env,
      logger
    });

    await agent.handleIncomingMessage({
      waId: '201000000000',
      messageId: 'wamid.budget',
      text: 'السلام عليكم',
      type: 'text',
      raw: {
        id: 'wamid.budget',
        from: '201000000000',
        type: 'text',
        text: { body: 'السلام عليكم' }
      }
    });

    expect(prisma.message.count).toHaveBeenCalled();
    expect(whatsapp.sendText).not.toHaveBeenCalled();
  });

  it('does not budget-skip active sales flows like Wild Rift keys', async () => {
    const prisma = {
      business: { upsert: jest.fn().mockResolvedValue({ id: 'business-id', slug: 'thenexus' }) },
      contact: { upsert: jest.fn().mockResolvedValue({ id: 'contact-id' }) },
      conversation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        findUnique: jest.fn().mockResolvedValue({ firstResponseAt: null }),
        update: jest.fn().mockResolvedValue({ id: 'conversation-id' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'conversation-id',
          handoffStatus: 'NONE',
          aiEnabled: true,
          lastIntent: null,
          detectedGame: 'wild_rift',
          lastAskedQuestion: null,
          pendingFields: { game: 'wild_rift' }
        })
      },
      message: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(8),
        create: jest.fn()
          .mockResolvedValueOnce({ id: 'inbound-id', createdAt: new Date('2026-06-09T07:54:58.000Z') })
          .mockResolvedValueOnce({ id: 'outbound-id' })
      },
      adminSetting: { findMany: jest.fn().mockResolvedValue([]) }
    };
    const whatsapp = {
      sendText: jest.fn().mockResolvedValue({ messageId: 'wamid.keys-out' }),
      sendImage: jest.fn()
    };
    const agent = new AgentService({
      prisma: prisma as never,
      whatsapp,
      knowledge: {} as never,
      mediaCatalog: { listActive: jest.fn().mockResolvedValue([]) } as never,
      ai: { createChatCompletion: jest.fn() } as never,
      env,
      logger
    });

    await agent.handleIncomingMessage({
      waId: '905377859633',
      messageId: 'wamid.keys',
      text: 'عايز اشحن مفاتيح',
      type: 'text',
      raw: {
        id: 'wamid.keys',
        from: '905377859633',
        type: 'text',
        text: { body: 'عايز اشحن مفاتيح' }
      }
    });

    expect(prisma.message.count).not.toHaveBeenCalled();
    expect(whatsapp.sendText).toHaveBeenCalledWith(
      '905377859633',
      expect.stringContaining('كام مفتاح')
    );
  });
});
