import {
  IWhatsAppProvider,
  WhatsAppMessage,
  SendMessageParams,
  SendMessageResponse,
  WebhookVerification,
} from './provider.interface.js';
import { logger } from '../../../utils/logger.js';

interface MetaWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
        image?: { id: string; mime_type: string; sha256: string };
      }>;
    };
    field: string;
  }>;
}

interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

/**
 * Meta WhatsApp Cloud API Provider
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class MetaWhatsAppProvider implements IWhatsAppProvider {
  constructor(
    private accessToken: string,
    private phoneNumberId: string,
    private webhookVerifyToken: string
  ) {}

  /**
   * Verify webhook for Meta (GET request with hub.challenge)
   */
  verifyWebhook(params: Record<string, string>): WebhookVerification {
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];

    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      logger.info('Meta webhook verified successfully');
      return { isValid: true, challenge };
    }

    logger.warn('Meta webhook verification failed');
    return { isValid: false };
  }

  /**
   * Parse incoming message from Meta webhook
   */
  parseIncomingMessage(payload: unknown): WhatsAppMessage | null {
    try {
      const data = payload as MetaWebhookPayload;

      if (data.object !== 'whatsapp_business_account') {
        return null;
      }

      const entry = data.entry?.[0];
      if (!entry) return null;

      const change = entry.changes?.[0];
      if (!change || change.field !== 'messages') return null;

      const message = change.value.messages?.[0];
      if (!message) return null;

      // Only handle text messages for now (extend for media later)
      if (message.type !== 'text' || !message.text) {
        logger.info({ type: message.type }, 'Non-text message received, skipping');
        return null;
      }

      return {
        from: message.from,
        text: message.text.body,
        messageId: message.id,
        timestamp: parseInt(message.timestamp, 10),
      };
    } catch (error) {
      logger.error({ error }, 'Failed to parse Meta webhook payload');
      return null;
    }
  }

  /**
   * Send message via Meta Cloud API
   * TODO: Implement actual API call to Meta
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    try {
      // TODO: Replace with actual Meta API call
      // const response = await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.accessToken}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     messaging_product: 'whatsapp',
      //     to: params.to,
      //     type: 'text',
      //     text: { body: params.text },
      //   }),
      // });

      logger.info(
        {
          to: params.to,
          provider: 'meta',
          phoneNumberId: this.phoneNumberId,
        },
        'Sending WhatsApp message (STUB - implement API call)'
      );

      // STUB: Return fake success
      return {
        messageId: `wamid.stub_${Date.now()}`,
        status: 'sent',
      };
    } catch (error) {
      logger.error({ error, params }, 'Failed to send Meta WhatsApp message');
      return {
        messageId: '',
        status: 'failed',
      };
    }
  }

  getProviderName(): string {
    return 'META';
  }
}
