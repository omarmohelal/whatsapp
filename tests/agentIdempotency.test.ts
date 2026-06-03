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
});
