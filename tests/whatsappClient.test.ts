import { env } from '../src/config/env';
import { WhatsAppCloudClient, classifyWhatsAppCloudError } from '../src/services/whatsapp';

describe('WhatsApp Cloud client error handling', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('classifies expired token / access denied errors', () => {
    expect(
      classifyWhatsAppCloudError(401, {
        error: { code: 190, message: 'Invalid OAuth access token' }
      })
    ).toBe('whatsapp_access_denied_or_expired_token');
  });

  it('throws a useful AppError when Meta send fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          code: 190,
          message: 'Invalid OAuth access token'
        }
      })
    } as Response);

    const client = new WhatsAppCloudClient(env);

    await expect(client.sendText('201000000000', 'hello')).rejects.toMatchObject({
      code: 'whatsapp_access_denied_or_expired_token'
    });
  });
});
