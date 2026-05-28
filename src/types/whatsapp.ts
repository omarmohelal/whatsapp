export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: 'whatsapp';
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        contacts?: Array<{
          wa_id: string;
          profile?: {
            name?: string;
          };
        }>;
        messages?: WhatsAppIncomingMessage[];
        statuses?: Array<Record<string, unknown>>;
      };
    }>;
  }>;
}

export interface WhatsAppIncomingMessage {
  id: string;
  from: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
  image?: {
    id?: string;
    mime_type?: string;
    sha256?: string;
    caption?: string;
  };
}

export interface IncomingWhatsAppJob {
  channel?: 'whatsapp' | 'messenger';
  businessSlug?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  waId: string;
  profileName?: string;
  messageId: string;
  text?: string;
  type: 'text' | 'image' | 'sticker' | 'unknown';
  mediaId?: string;
  mediaCaption?: string;
  mediaUrl?: string;
  isGroup?: boolean;
  groupId?: string;
  mentionsBot?: boolean;
  raw: WhatsAppIncomingMessage;
}
