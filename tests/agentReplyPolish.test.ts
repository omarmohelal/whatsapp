import { env } from '../src/config/env';
import { logger } from '../src/logger';
import { AgentService } from '../src/services/agent';

function createAgent() {
  return new AgentService({
    prisma: {} as never,
    whatsapp: {} as never,
    knowledge: {} as never,
    mediaCatalog: {} as never,
    ai: {} as never,
    env,
    logger
  });
}

describe('agent reply polishing', () => {
  it('corrects stale game-context replies when the customer asks about account form fields', () => {
    const agent = createAgent() as unknown as {
      polishAiResponse: (response: string, customerText: string, memory: unknown) => string;
    };

    const reply = agent.polishAiResponse(
      'تمام ❤️ Wild Rift. ابعت عدد الكورز أو اسم السكن ونكمل.',
      'مش فاهم الفورم وخانة Title',
      { detectedGame: 'wild_rift', pendingFields: { game: 'wild_rift' } }
    );

    expect(reply).toContain('الفورم خاص بعرض الأكونت');
    expect(reply).not.toContain('كورز');
  });

  it('keeps Gemini replies to one customer question', () => {
    const agent = createAgent() as unknown as {
      polishAiResponse: (response: string, customerText: string, memory: unknown) => string;
    };

    const reply = agent.polishAiResponse(
      'تمام ❤️ تحب Wild Rift ولا League؟ وميزانيتك كام؟ والسيرفر إيه؟',
      'عايز أكونت',
      {}
    );

    expect((reply.match(/[؟?]/g) ?? []).length).toBeLessThanOrEqual(1);
  });
});
