import request from 'supertest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { logger } from '../src/logger';

describe('WhatsApp webhook verification', () => {
  it('returns the Meta challenge when the verify token is valid', async () => {
    const app = createApp({ env, logger });

    const response = await request(app)
      .get('/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'verify-token',
        'hub.challenge': 'challenge-123'
      });

    expect(response.status).toBe(200);
    expect(response.text).toBe('challenge-123');
  });

  it('rejects invalid verification tokens', async () => {
    const app = createApp({ env, logger });

    const response = await request(app)
      .get('/webhooks/whatsapp')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'challenge-123'
      });

    expect(response.status).toBe(403);
  });

  it('extracts incoming WhatsApp messages and sends them to the agent', async () => {
    const agent = {
      handleIncomingMessage: jest.fn().mockResolvedValue(undefined)
    };
    const app = createApp({ env, logger, agent });

    const response = await request(app)
      .post('/webhooks/whatsapp')
      .send({
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: {
                    phone_number_id: 'phone-1',
                    display_phone_number: '+201000000000'
                  },
                  contacts: [
                    {
                      wa_id: '201111111111',
                      profile: { name: 'Nexus Customer' }
                    }
                  ],
                  messages: [
                    {
                      id: 'wamid.123',
                      from: '201111111111',
                      type: 'text',
                      text: { body: 'عايز اشحن وايلد ريفت' }
                    }
                  ]
                }
              }
            ]
          }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, accepted: 1 });
    expect(agent.handleIncomingMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        waId: '201111111111',
        messageId: 'wamid.123',
        text: 'عايز اشحن وايلد ريفت',
        type: 'text'
      })
    );
  });
});
