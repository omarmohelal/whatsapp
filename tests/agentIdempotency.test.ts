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
});
