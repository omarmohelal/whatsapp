import { Router } from 'express';
import type { Queue } from 'bullmq';
import type { AppLogger } from '../logger';
import type { AgentService } from '../services/agent';
import type { IncomingWhatsAppJob, WhatsAppWebhookPayload } from '../types/whatsapp';
import { asyncHandler } from '../utils/asyncHandler';

interface WhatsAppWebhookRouterDeps {
  verifyToken: string;
  logger: AppLogger;
  incomingQueue?: Queue;
  agent?: Pick<AgentService, 'handleIncomingMessage'>;
}

export function extractIncomingMessages(payload: WhatsAppWebhookPayload): IncomingWhatsAppJob[] {
  const jobs: IncomingWhatsAppJob[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const displayPhoneNumber = value?.metadata?.display_phone_number;
      const contactByWaId = new Map(
        (value?.contacts ?? []).map((contact) => [contact.wa_id, contact.profile?.name])
      );

      for (const message of value?.messages ?? []) {
        const type =
          message.type === 'text' ? 'text' : message.type === 'image' ? 'image' : 'unknown';

        jobs.push({
          phoneNumberId,
          displayPhoneNumber,
          waId: message.from,
          profileName: contactByWaId.get(message.from),
          messageId: message.id,
          text: message.text?.body,
          type,
          mediaId: message.image?.id,
          mediaCaption: message.image?.caption,
          raw: message
        });
      }
    }
  }

  return jobs;
}

export function createWhatsAppWebhookRouter(deps: WhatsAppWebhookRouterDeps) {
  const router = Router();

  router.get('/webhooks/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === deps.verifyToken && typeof challenge === 'string') {
      res.status(200).send(challenge);
      return;
    }

    res.sendStatus(403);
  });

  router.post(
    '/webhooks/whatsapp',
    asyncHandler(async (req, res) => {
      const payload = req.body as WhatsAppWebhookPayload;
      const jobs = extractIncomingMessages(payload);

      for (const job of jobs) {
        if (deps.incomingQueue) {
          await deps.incomingQueue.add('incoming_message', job, {
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 1000
            },
            removeOnComplete: true,
            removeOnFail: 500
          });
        } else if (deps.agent) {
          await deps.agent.handleIncomingMessage(job);
        } else {
          deps.logger.warn('Webhook received with no queue or agent configured');
        }
      }

      res.status(200).json({ ok: true, accepted: jobs.length });
    })
  );

  return router;
}
