import crypto from 'crypto';
import { Router } from 'express';
import type { Queue } from 'bullmq';
import { z } from 'zod';
import type { Env } from '../config/env';
import type { AppLogger } from '../logger';
import type { AgentService } from '../services/agent';
import type { IncomingWhatsAppJob, WhatsAppWebhookPayload } from '../types/whatsapp';
import { asyncHandler } from '../utils/asyncHandler';

interface WhatsAppWebhookRouterDeps {
  env: Env;
  logger: AppLogger;
  incomingQueue?: Queue;
  agent?: Pick<AgentService, 'handleIncomingMessage'>;
}

interface RawBodyRequest {
  headers: Record<string, unknown>;
  rawBody?: Buffer;
}

const payloadSchema = z.object({
  object: z.string().optional(),
  entry: z.array(z.unknown()).optional()
});

function verifyMetaSignature(req: { headers: Record<string, unknown>; rawBody?: Buffer }, secret?: string) {
  if (!secret) {
    return true;
  }

  const signature = req.headers['x-hub-signature-256'];
  if (typeof signature !== 'string' || !signature.startsWith('sha256=')) {
    return false;
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    return false;
  }

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  return left.length === right.length && crypto.timingSafeEqual(left, right);
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

    if (mode === 'subscribe' && token === deps.env.WHATSAPP_VERIFY_TOKEN && typeof challenge === 'string') {
      res.status(200).send(challenge);
      return;
    }

    res.sendStatus(403);
  });

  router.post(
    '/webhooks/whatsapp',
    asyncHandler(async (req, res) => {
      if (!verifyMetaSignature(req as unknown as RawBodyRequest, deps.env.META_APP_SECRET)) {
        deps.logger.warn('Rejected WhatsApp webhook with invalid Meta signature');
        res.sendStatus(403);
        return;
      }

      const validation = payloadSchema.safeParse(req.body);
      if (!validation.success) {
        deps.logger.warn({ details: validation.error.flatten() }, 'Invalid WhatsApp webhook payload');
        res.status(200).json({ ok: true, accepted: 0 });
        return;
      }

      const jobs = extractIncomingMessages(req.body as WhatsAppWebhookPayload);

      for (const job of jobs) {
        deps.logger.info({ messageId: job.messageId, waId: job.waId }, 'Incoming webhook message received');
        try {
          if (deps.incomingQueue) {
            await deps.incomingQueue.add('incoming_message', job, {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000
              },
              removeOnComplete: true,
              removeOnFail: 500
            });
            deps.logger.info({ messageId: job.messageId }, 'Queue job created');
          } else if (deps.agent) {
            await deps.agent.handleIncomingMessage(job);
          } else {
            deps.logger.warn('Webhook received with no queue or agent configured');
          }
        } catch (error) {
          deps.logger.error({ err: error, messageId: job.messageId }, 'Failed to enqueue webhook job');
        }
      }

      res.status(200).json({ ok: true, accepted: jobs.length });
    })
  );

  return router;
}
