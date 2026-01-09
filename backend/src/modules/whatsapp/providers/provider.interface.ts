/**
 * WhatsApp Provider Interface
 * All WhatsApp providers (Meta, Twilio, etc.) must implement this interface
 */

export interface WhatsAppMessage {
  from: string; // Phone number
  text: string;
  messageId: string;
  timestamp: number;
  mediaUrl?: string;
  mediaType?: string;
}

export interface SendMessageParams {
  to: string; // Phone number
  text: string;
  mediaUrl?: string;
}

export interface SendMessageResponse {
  messageId: string;
  status: 'sent' | 'failed';
}

export interface WebhookVerification {
  challenge?: string;
  isValid: boolean;
}

/**
 * Base interface for WhatsApp providers
 */
export interface IWhatsAppProvider {
  /**
   * Verify webhook request (for GET requests with verification token)
   */
  verifyWebhook(params: Record<string, string>): WebhookVerification;

  /**
   * Parse incoming webhook message
   */
  parseIncomingMessage(payload: unknown): WhatsAppMessage | null;

  /**
   * Send a message through WhatsApp
   */
  sendMessage(params: SendMessageParams): Promise<SendMessageResponse>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
