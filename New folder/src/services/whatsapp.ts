import type { Env } from '../config/env';
import { AppError } from '../utils/errors';

export interface WhatsAppSendResult {
  messageId?: string;
  raw?: unknown;
}

export interface WhatsAppClient {
  sendText(to: string, body: string): Promise<WhatsAppSendResult>;
  sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult>;
}

export class WhatsAppCloudClient implements WhatsAppClient {
  private readonly baseUrl: string;

  constructor(private readonly env: Env) {
    this.baseUrl = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}`;
  }

  async sendText(to: string, body: string): Promise<WhatsAppSendResult> {
    return this.sendMessage({
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
    return this.sendMessage({
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

  private async sendMessage(payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; code?: number };
    };

    if (!response.ok) {
      throw new AppError(
        response.status,
        'whatsapp_send_failed',
        data.error?.message ?? 'Failed to send WhatsApp message',
        data
      );
    }

    return {
      messageId: data.messages?.[0]?.id,
      raw: data
    };
  }
}
