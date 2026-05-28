import crypto from 'crypto';
import { Router } from 'express';
import type { Queue } from 'bullmq';
import { z } from 'zod';
import type { Env } from '../config/env';
import type { AppLogger } from '../logger';
import type { AgentService } from '../services/agent';
import type { IncomingWhatsAppJob, WhatsAppIncomingMessage } from '../types/whatsapp';
import { asyncHandler } from '../utils/asyncHandler';

interface MessengerWebhookRouterDeps {
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

interface MessengerPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      timestamp?: number;
      message?: {
        mid?: string;
        text?: string;
        attachments?: Array<{ type?: string; payload?: { url?: string } }>;
        is_echo?: boolean;
      };
      postback?: {
        mid?: string;
        title?: string;
        payload?: string;
      };
    }>;
  }>;
}

function verifyMetaSignature(req: RawBodyRequest, secret?: string) {
  if (!secret) return true;

  const signature = req.headers['x-hub-signature-256'];
  if (typeof signature !== 'string' || !signature.startsWith('sha256=')) return false;
  if (!req.rawBody) return false;

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex')}`;
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function extractIncomingMessengerMessages(payload: MessengerPayload): IncomingWhatsAppJob[] {
  const jobs: IncomingWhatsAppJob[] = [];

  for (const entry of payload.entry ?? []) {
    for (const item of entry.messaging ?? []) {
      if (item.message?.is_echo) continue;

      const senderId = item.sender?.id;
      if (!senderId) continue;

      const text = item.message?.text ?? item.postback?.title ?? item.postback?.payload;
      const firstAttachment = item.message?.attachments?.[0];
      const type = text ? 'text' : firstAttachment?.type === 'image' ? 'image' : 'unknown';
      const messageId = item.message?.mid ?? item.postback?.mid ?? `messenger-${senderId}-${item.timestamp ?? Date.now()}`;

      const raw: WhatsAppIncomingMessage = {
        id: messageId,
        from: `messenger:${senderId}`,
        timestamp: item.timestamp ? String(Math.floor(item.timestamp / 1000)) : undefined,
        type,
        text: text ? { body: text } : undefined,
        image: firstAttachment?.type === 'image' ? { id: firstAttachment.payload?.url ?? messageId } : undefined
      };

      jobs.push({
        phoneNumberId: `messenger:${entry.id ?? item.recipient?.id ?? 'page'}`,
        displayPhoneNumber: 'Messenger',
        waId: `messenger:${senderId}`,
        profileName: undefined,
        messageId,
        text,
        type,
        mediaId: firstAttachment?.payload?.url,
        raw
      });
    }
  }

  return jobs;
}

export function createMessengerWebhookRouter(deps: MessengerWebhookRouterDeps) {
  const router = Router();

  router.get('/webhooks/messenger', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const verifyToken = deps.env.MESSENGER_VERIFY_TOKEN || deps.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken && typeof challenge === 'string') {
      res.status(200).send(challenge);
      return;
    }

    res.sendStatus(403);
  });

  router.post(
    '/webhooks/messenger',
    asyncHandler(async (req, res) => {
      if (!verifyMetaSignature(req as unknown as RawBodyRequest, deps.env.META_APP_SECRET)) {
        deps.logger.warn('Rejected Messenger webhook with invalid Meta signature');
        res.sendStatus(403);
        return;
      }

      const validation = payloadSchema.safeParse(req.body);
      if (!validation.success) {
        deps.logger.warn({ details: validation.error.flatten() }, 'Invalid Messenger webhook payload');
        res.status(200).json({ ok: true, accepted: 0 });
        return;
      }

      const jobs = extractIncomingMessengerMessages(req.body as MessengerPayload);

      for (const job of jobs) {
        deps.logger.info({ messageId: job.messageId, senderId: job.waId }, 'Incoming Messenger message received');
        try {
          if (deps.incomingQueue) {
            await deps.incomingQueue.add('incoming_message', job, {
              attempts: 3,
              backoff: { type: 'exponential', delay: 1000 },
              removeOnComplete: true,
              removeOnFail: 500
            });
          } else if (deps.agent) {
            await deps.agent.handleIncomingMessage(job);
          }
        } catch (error) {
          deps.logger.error({ err: error, messageId: job.messageId }, 'Failed to process Messenger job');
        }
      }

      res.status(200).json({ ok: true, accepted: jobs.length });
    })
  );

  return router;
}
