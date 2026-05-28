import { env } from '../src/config/env';
import { AI_FALLBACK_REPLY } from '../src/config/constants';
import { GeminiService } from '../src/services/gemini';

describe('Gemini fallback', () => {
  it('returns a safe fallback when Gemini chat fails', async () => {
    const service = new GeminiService(env);
    (service as unknown as { withRetry: jest.Mock }).withRetry = jest
      .fn()
      .mockRejectedValue(new Error('quota'));

    const reply = await service.createChatCompletion([{ role: 'user', content: 'hello' }]);

    expect(reply).toBe(AI_FALLBACK_REPLY);
  });
});
