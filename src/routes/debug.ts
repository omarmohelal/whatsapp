import { Router } from 'express';
import { z } from 'zod';
import type { Env } from '../config/env';
import type { AppLogger } from '../logger';
import { maskCustomerIdentifiers } from '../services/credentials';
import { asyncHandler } from '../utils/asyncHandler';

interface DebugRouterDeps {
  env: Env;
  logger: AppLogger;
}

const testSendSchema = z.object({
  to: z.string().min(5),
  text: z.string().min(1).max(4096)
});

async function parseMetaResponse(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function extractMetaError(body: unknown) {
  if (!body || typeof body !== 'object' || !('error' in body)) {
    return {};
  }

  const error = (body as { error?: { code?: number; message?: string } }).error;
  return {
    errorCode: error?.code,
    errorMessage: error?.message
  };
}

export function createDebugRouter(deps: DebugRouterDeps) {
  const router = Router();

  router.get('/env', (_req, res) => {
    res.json({
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY || deps.env.GEMINI_API_KEY),
      hasWhatsAppToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN || deps.env.WHATSAPP_ACCESS_TOKEN),
      hasPhoneNumberId: Boolean(
        process.env.WHATSAPP_PHONE_NUMBER_ID || deps.env.WHATSAPP_PHONE_NUMBER_ID
      ),
      hasRedisUrl: Boolean(process.env.REDIS_URL || deps.env.REDIS_URL),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL || deps.env.DATABASE_URL)
    });
  });

  router.post(
    '/test-send',
    asyncHandler(async (req, res) => {
      const body = testSendSchema.parse(req.body);
      const url = `https://graph.facebook.com/${deps.env.WHATSAPP_API_VERSION}/${deps.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

      deps.logger.info(
        { to: maskCustomerIdentifiers(body.to) },
        'Debug WhatsApp test send requested'
      );

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${deps.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: body.to,
            type: 'text',
            text: {
              preview_url: false,
              body: body.text
            }
          })
        });
        const responseBody = await parseMetaResponse(response);

        if (!response.ok) {
          deps.logger.error(
            {
              status: response.status,
              ...extractMetaError(responseBody),
              responseBody
            },
            'Debug WhatsApp test send failed'
          );
          res.status(response.status).json({
            ok: false,
            status: response.status,
            body: responseBody
          });
          return;
        }

        deps.logger.info(
          {
            status: response.status,
            responseBody
          },
          'Debug WhatsApp test send succeeded'
        );
        res.json({
          ok: true,
          status: response.status,
          body: responseBody
        });
      } catch (error) {
        deps.logger.error({ err: error }, 'Debug WhatsApp test send crashed');
        res.status(502).json({
          ok: false,
          error: {
            message: error instanceof Error ? error.message : 'Failed to call Meta API'
          }
        });
      }
    })
  );

  return router;
}
