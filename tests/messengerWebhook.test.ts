import request from 'supertest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { logger } from '../src/logger';
import { extractIncomingMessengerMessages } from '../src/routes/messengerWebhook';

describe('Messenger webhook', () => {
  it('verifies Messenger webhook challenge', async () => {
    const app = createApp({ env, logger });

    const response = await request(app).get('/webhooks/messenger').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': env.WHATSAPP_VERIFY_TOKEN,
      'hub.challenge': 'messenger-challenge'
    });

    expect(response.status).toBe(200);
    expect(response.text).toBe('messenger-challenge');
  });

  it('extracts Messenger messages for the shared agent', () => {
    const jobs = extractIncomingMessengerMessages({
      object: 'page',
      entry: [
        {
          id: 'page-id',
          messaging: [
            {
              sender: { id: 'psid-1' },
              recipient: { id: 'page-id' },
              timestamp: 1,
              message: { mid: 'mid.1', text: 'عايز اشحن' }
            }
          ]
        }
      ]
    });

    expect(jobs).toEqual([
      expect.objectContaining({
        channel: 'messenger',
        waId: 'messenger:psid-1',
        messageId: 'mid.1',
        text: 'عايز اشحن',
        type: 'text',
        isGroup: false
      })
    ]);
  });
});
