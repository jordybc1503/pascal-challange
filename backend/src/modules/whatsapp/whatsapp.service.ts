import { prisma } from '../../db/client.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { WhatsAppProvider, MessageStatus, SenderType } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption.js';
import { MetaWhatsAppProvider } from './providers/meta.provider.js';
import { TwilioWhatsAppProvider } from './providers/twilio.provider.js';
import { IWhatsAppProvider } from './providers/provider.interface.js';
import { logger } from '../../utils/logger.js';
import { serialize } from '../../utils/serializer.js';
import { queueJob } from '../../jobs/producer.js';

interface CreateConfigParams {
  tenantId: string;
  provider: WhatsAppProvider;
  displayName: string;
  phoneNumber: string;
  providerAccountId: string;
  accessToken: string;
  webhookVerifyToken?: string;
  secret?: string;
}

export class WhatsAppService {
  /**
   * Create or update WhatsApp configuration for a tenant
   */
  async createOrUpdateConfig(params: CreateConfigParams) {
    const { tenantId, provider, displayName, phoneNumber, providerAccountId, accessToken, webhookVerifyToken, secret } = params;

    // Encrypt sensitive data
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedSecret = secret ? encrypt(secret) : null;

    // Check if channel with this providerAccountId exists for this tenant
    const existingChannel = await prisma.whatsAppChannel.findUnique({
      where: {
        tenantId_providerAccountId: {
          tenantId,
          providerAccountId,
        },
      },
    });

    if (existingChannel) {
      // Update existing channel and credentials
      const updated = await prisma.$transaction(async (tx) => {
        const channel = await tx.whatsAppChannel.update({
          where: { id: existingChannel.id },
          data: {
            displayName,
            phoneNumber,
            isActive: true,
          },
        });

        await tx.whatsAppCredential.upsert({
          where: { channelId: channel.id },
          update: {
            encryptedAccessToken,
            encryptedSecret,
            webhookVerifyToken,
          },
          create: {
            tenantId,
            channelId: channel.id,
            encryptedAccessToken,
            encryptedSecret,
            webhookVerifyToken,
          },
        });

        return channel;
      });

      return serialize(updated);
    }

    // Create new channel with credentials
    const result = await prisma.$transaction(async (tx) => {
      const channel = await tx.whatsAppChannel.create({
        data: {
          tenantId,
          provider,
          displayName,
          phoneNumber,
          providerAccountId,
          isActive: true,
        },
      });

      await tx.whatsAppCredential.create({
        data: {
          tenantId,
          channelId: channel.id,
          encryptedAccessToken,
          encryptedSecret,
          webhookVerifyToken,
        },
      });

      return channel;
    });

    return serialize(result);
  }

  /**
   * Get WhatsApp config for a tenant
   */
  async getConfig(tenantId: string) {
    const channels = await prisma.whatsAppChannel.findMany({
      where: { tenantId },
      include: {
        credentials: {
          select: {
            id: true,
            webhookVerifyToken: true,
            // Don't return encrypted tokens in response
          },
        },
      },
    });

    return serialize(channels);
  }

  /**
   * Handle incoming WhatsApp webhook
   */
  async handleIncomingWebhook(providerAccountId: string, payload: unknown, queryParams: Record<string, string>) {
    // Find channel by providerAccountId
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { providerAccountId },
      include: {
        credentials: true,
        tenant: true,
      },
    });

    if (!channel) {
      throw new NotFoundError('WhatsApp channel not found');
    }

    if (!channel.credentials) {
      throw new BadRequestError('Channel credentials not configured');
    }

    // Create provider instance
    const provider = this.getProviderInstance(channel, channel.credentials);

    // Check if this is a verification request (GET)
    if (Object.keys(queryParams).length > 0) {
      const verification = provider.verifyWebhook(queryParams);
      return verification;
    }

    // Parse incoming message
    const message = provider.parseIncomingMessage(payload);
    if (!message) {
      logger.warn({ providerAccountId }, 'Could not parse incoming message');
      return null;
    }

    logger.info({
      tenantId: channel.tenantId,
      from: message.from,
      messageId: message.messageId,
    }, 'Incoming WhatsApp message');

    // Upsert lead by phone
    const lead = await prisma.lead.upsert({
      where: {
        tenantId_phone: {
          tenantId: channel.tenantId,
          phone: message.from,
        },
      },
      update: {
        metadata: { lastContact: new Date().toISOString() },
      },
      create: {
        tenantId: channel.tenantId,
        name: message.from, // Use phone as name initially
        phone: message.from,
        metadata: { source: 'whatsapp', channelId: channel.id },
      },
    });

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        tenantId: channel.tenantId,
        leadId: lead.id,
        status: { in: ['OPEN', 'PENDING'] },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          tenantId: channel.tenantId,
          leadId: lead.id,
          status: 'OPEN',
          lastMessageAt: new Date(),
          lastMessageSenderType: SenderType.LEAD,
        },
      });
    }

    // Create message
    const newMessage = await prisma.message.create({
      data: {
        tenantId: channel.tenantId,
        conversationId: conversation.id,
        senderType: SenderType.LEAD,
        contentText: message.text,
        externalProvider: channel.provider,
        externalMessageId: message.messageId,
        status: MessageStatus.DELIVERED,
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessageSenderType: SenderType.LEAD,
      },
    });

    // Enqueue AI analysis job
    await queueJob('AI_ANALYZE_CONVERSATION', {
      tenantId: channel.tenantId,
      conversationId: conversation.id,
    });

    // TODO: Emit socket event message:new

    return {
      conversationId: conversation.id,
      messageId: newMessage.id,
    };
  }

  /**
   * Send WhatsApp message from agent
   */
  async sendMessage(tenantId: string, conversationId: string, text: string, userId: string) {
    // Get conversation with lead
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
      include: {
        lead: true,
      },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    if (!conversation.lead.phone) {
      throw new BadRequestError('Lead has no phone number');
    }

    // Get active WhatsApp channel for tenant
    const channel = await prisma.whatsAppChannel.findFirst({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        credentials: true,
      },
    });

    if (!channel || !channel.credentials) {
      throw new BadRequestError('No active WhatsApp channel configured');
    }

    // Create provider instance
    const provider = this.getProviderInstance(channel, channel.credentials);

    // Send via provider
    const result = await provider.sendMessage({
      to: conversation.lead.phone,
      text,
    });

    // Create message record
    const message = await prisma.message.create({
      data: {
        tenantId,
        conversationId,
        senderType: SenderType.AGENT,
        senderUserId: userId,
        contentText: text,
        externalProvider: channel.provider,
        externalMessageId: result.messageId,
        status: result.status === 'sent' ? MessageStatus.SENT : MessageStatus.FAILED,
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessageSenderType: SenderType.AGENT,
        lastAgentReplyAt: new Date(),
      },
    });

    // TODO: Emit socket event

    return serialize(message);
  }

  /**
   * Get provider instance from channel and credentials
   */
  private getProviderInstance(
    channel: { provider: WhatsAppProvider; providerAccountId: string; phoneNumber: string },
    credentials: { encryptedAccessToken: string; encryptedSecret: string | null; webhookVerifyToken: string | null }
  ): IWhatsAppProvider {
    const accessToken = decrypt(credentials.encryptedAccessToken);
    const secret = credentials.encryptedSecret ? decrypt(credentials.encryptedSecret) : '';

    if (channel.provider === WhatsAppProvider.META) {
      return new MetaWhatsAppProvider(
        accessToken,
        channel.providerAccountId,
        credentials.webhookVerifyToken || ''
      );
    } else if (channel.provider === WhatsAppProvider.TWILIO) {
      return new TwilioWhatsAppProvider(
        channel.providerAccountId,
        secret,
        channel.phoneNumber
      );
    }

    throw new BadRequestError(`Unsupported provider: ${channel.provider}`);
  }
}

export const whatsAppService = new WhatsAppService();
