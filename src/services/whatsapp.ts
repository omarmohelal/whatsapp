import type { Env } from '../config/env';
import { logger } from '../logger';
import { AppError } from '../utils/errors';

export interface WhatsAppSendResult {
  messageId?: string;
  raw?: unknown;
}

export interface WhatsAppClient {
  sendText(to: string, body: string): Promise<WhatsAppSendResult>;
  sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult>;
}

interface MetaErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
  messages?: Array<{ id?: string }>;
}

function classifyMetaError(status: number, body: MetaErrorBody) {
  const message = body.error?.message?.toLowerCase() ?? '';
  const code = body.error?.code;
  const subcode = body.error?.error_subcode;

  if (status === 401 || status === 403 || code === 190 || message.includes('access token')) {
    return 'whatsapp_access_denied_or_expired_token';
  }
  if (message.includes('recipient') && message.includes('allowed')) {
    return 'whatsapp_recipient_not_allowed';
  }
  if (message.includes('phone number id') || message.includes('unsupported post request')) {
    return 'whatsapp_invalid_phone_number_id';
  }
  if (subcode === 2018001 || message.includes('invalid parameter')) {
    return 'whatsapp_invalid_recipient_or_payload';
  }
  return 'whatsapp_send_failed';
}

export class WhatsAppCloudClient implements WhatsAppClient {
  private readonly baseUrl: string;

  constructor(private readonly env: Env) {
    this.baseUrl = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}`;
  }

  async sendText(to: string, body: string): Promise<WhatsAppSendResult> {
    if (to.startsWith('messenger:')) {
      return this.sendMessengerText(to.replace(/^messenger:/, ''), body);
    }

    return this.sendMessage('text', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body
      }
    });
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult> {
    if (to.startsWith('messenger:')) {
      return this.sendMessengerImage(to.replace(/^messenger:/, ''), imageUrl, caption);
    }

    return this.sendMessage('image', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        caption
      }
    });
  }


  private async sendMessengerText(psid: string, body: string): Promise<WhatsAppSendResult> {
    return this.sendMessengerMessage('text', {
      recipient: { id: psid },
      messaging_type: 'RESPONSE',
      message: { text: body }
    });
  }

  private async sendMessengerImage(psid: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult> {
    const result = await this.sendMessengerMessage('image', {
      recipient: { id: psid },
      messaging_type: 'RESPONSE',
      message: {
        attachment: {
          type: 'image',
          payload: { url: imageUrl, is_reusable: true }
        }
      }
    });

    if (caption?.trim()) {
      await this.sendMessengerText(psid, caption);
    }

    return result;
  }

  private async sendMessengerMessage(messageType: 'text' | 'image', payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
    if (!this.env.MESSENGER_PAGE_ACCESS_TOKEN) {
      throw new AppError(500, 'messenger_page_token_missing', 'MESSENGER_PAGE_ACCESS_TOKEN is not configured');
    }

    const response = await fetch(`https://graph.facebook.com/${this.env.WHATSAPP_API_VERSION}/me/messages?access_token=${this.env.MESSENGER_PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = (await response.json().catch(() => ({}))) as MetaErrorBody & { message_id?: string };

    if (!response.ok) {
      logger.error({ status: response.status, responseBody: data }, 'Messenger send failed');
      throw new AppError(response.status, 'messenger_send_failed', data.error?.message ?? 'Failed to send Messenger message', data);
    }

    logger.info({ messageType, messageId: data.message_id, responseBody: data }, 'Messenger send success');
    return { messageId: data.message_id, raw: data };
  }

  private async sendMessage(
    messageType: 'text' | 'image',
    payload: Record<string, unknown>
  ): Promise<WhatsAppSendResult> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = (await response.json().catch(() => ({}))) as MetaErrorBody;

    if (!response.ok) {
      const code = classifyMetaError(response.status, data);
      logger.error(
        {
          status: response.status,
          code,
          errorCode: data.error?.code,
          errorMessage: data.error?.message,
          metaCode: data.error?.code,
          metaSubcode: data.error?.error_subcode,
          metaMessage: data.error?.message,
          fbtraceId: data.error?.fbtrace_id,
          responseBody: data
        },
        'WhatsApp send failed'
      );
      throw new AppError(
        response.status,
        code,
        data.error?.message ?? 'Failed to send WhatsApp message',
        data
      );
    }

    const messageId = data.messages?.[0]?.id;
    logger.info({ messageType, messageId, responseBody: data }, 'WhatsApp send success');

    return {
      messageId,
      raw: data
    };
  }
}

export const classifyWhatsAppCloudError = classifyMetaError;
