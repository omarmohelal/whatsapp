import request from 'supertest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { logger } from '../src/logger';

describe('debug endpoints', () => {
  const adminHeaders = { 'x-admin-api-key': env.ADMIN_API_KEY };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns environment presence booleans without secrets', async () => {
    const app = createApp({ env, logger });

    const response = await request(app).get('/debug/env').set(adminHeaders);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      hasGeminiKey: true,
      hasWhatsAppToken: true,
      hasPhoneNumberId: true,
      hasRedisUrl: true,
      hasDatabaseUrl: true
    });
    expect(JSON.stringify(response.body)).not.toContain(env.WHATSAPP_ACCESS_TOKEN);
    expect(JSON.stringify(response.body)).not.toContain(env.GEMINI_API_KEY);
  });

  it('sends a direct WhatsApp test message and returns the Meta response', async () => {
    const metaBody = { messages: [{ id: 'wamid.debug' }] };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(metaBody)
    } as Response);
    const app = createApp({ env, logger });

    const response = await request(app)
      .post('/debug/test-send')
      .set(adminHeaders)
      .send({ to: '201014331830', text: 'test' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, status: 200, body: metaBody });
    expect(fetchMock).toHaveBeenCalledWith(
      `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`
        }),
        body: expect.stringContaining('"to":"201014331830"')
      })
    );
  });

  it('returns the full Meta error body when test send fails', async () => {
    const metaBody = { error: { code: 190, message: 'Access token expired' } };
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify(metaBody)
    } as Response);
    const app = createApp({ env, logger });

    const response = await request(app)
      .post('/debug/test-send')
      .set(adminHeaders)
      .send({ to: '201014331830', text: 'test' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ ok: false, status: 401, body: metaBody });
  });
});
