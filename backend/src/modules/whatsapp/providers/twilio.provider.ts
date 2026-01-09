import {
  IWhatsAppProvider,
  WhatsAppMessage,
  SendMessageParams,
  SendMessageResponse,
  WebhookVerification,
} from './provider.interface.js';
import { logger } from '../../../utils/logger.js';

/**
 * Twilio WhatsApp Provider (stub implementation)
 * Docs: https://www.twilio.com/docs/whatsapp/api
 *
 * TODO: Implement Twilio-specific logic if needed
 * For now, this is a basic stub that can be extended
 */
export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  constructor(
    private accountSid: string,
    private authToken: string,
    private phoneNumber: string
  ) {}

  verifyWebhook(params: Record<string, string>): WebhookVerification {
    // TODO: Implement Twilio signature verification
    // https://www.twilio.com/docs/usage/webhooks/webhooks-security
    logger.info('Twilio webhook verification (STUB)');
    return { isValid: true };
  }

  parseIncomingMessage(payload: unknown): WhatsAppMessage | null {
    try {
      // TODO: Parse Twilio webhook format
      // Twilio uses form-urlencoded POST with fields like:
      // From, To, Body, MessageSid, etc.
      logger.info({ payload }, 'Parsing Twilio message (STUB)');
      return null;
    } catch (error) {
      logger.error({ error }, 'Failed to parse Twilio webhook payload');
      return null;
    }
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    try {
      // TODO: Implement Twilio API call
      // const client = twilio(this.accountSid, this.authToken);
      // const message = await client.messages.create({
      //   from: `whatsapp:${this.phoneNumber}`,
      //   to: `whatsapp:${params.to}`,
      //   body: params.text,
      // });

      logger.info(
        { to: params.to, provider: 'twilio' },
        'Sending Twilio WhatsApp message (STUB)'
      );

      return {
        messageId: `twilio_stub_${Date.now()}`,
        status: 'sent',
      };
    } catch (error) {
      logger.error({ error, params }, 'Failed to send Twilio WhatsApp message');
      return {
        messageId: '',
        status: 'failed',
      };
    }
  }

  getProviderName(): string {
    return 'TWILIO';
  }
}
