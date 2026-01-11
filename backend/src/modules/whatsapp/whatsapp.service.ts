import { prisma } from '../../db/client.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { WhatsAppProvider, MessageStatus, SenderType } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption.js';
import { MetaWhatsAppProvider } from './providers/meta.provider.js';
import { TwilioWhatsAppProvider } from './providers/twilio.provider.js';
import { IWhatsAppProvider } from './provider.interface.js';
import { logger } from '../../utils/logger.js';
import { serialize } from '../../utils/serializer.js';
import { aiJobProducer } from '../../jobs/producer.js';
import { getIO } from '../../sockets/socket.js';

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

    logger.info('Creating/Updating WhatsApp config', {
      tenantId,
      provider,
      providerAccountId,
      webhookVerifyToken: webhookVerifyToken || '(empty)',
      hasAccessToken: !!accessToken,
      hasSecret: !!secret,
    });

    // Check if channel with this providerAccountId exists for this tenant
    const existingChannel = await prisma.whatsAppChannel.findUnique({
      where: {
        tenantId_providerAccountId: {
          tenantId,
          providerAccountId,
        },
      },
      include: {
        credentials: true,
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

        // Only update tokens if provided, otherwise keep existing ones
        const updateData: any = {};
        if (accessToken) {
          updateData.encryptedAccessToken = encrypt(accessToken);
        }
        if (secret) {
          updateData.encryptedSecret = encrypt(secret);
        }
        if (webhookVerifyToken !== undefined) {
          updateData.webhookVerifyToken = webhookVerifyToken;
        }

        // If no credential updates provided, use existing values
        const hasUpdates = Object.keys(updateData).length > 0;

        if (hasUpdates) {
          await tx.whatsAppCredential.update({
            where: { channelId: channel.id },
            data: updateData,
          });
        }

        return channel;
      });

      return serialize(updated);
    }

    // For new channels, accessToken is required
    if (!accessToken) {
      throw new BadRequestError('Access token is required for new configurations');
    }

    // Encrypt sensitive data
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedSecret = secret ? encrypt(secret) : null;

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
    logger.info('🔍 handleIncomingWebhook called', {
      providerAccountId,
      hasQueryParams: Object.keys(queryParams).length > 0,
      queryParams,
    });

    // Find channel by providerAccountId
    const channel = await prisma.whatsAppChannel.findFirst({
      where: { providerAccountId },
      include: {
        credentials: true,
        tenant: true,
      },
    });

    logger.info('📊 Database query result', {
      channelFound: !!channel,
      channelId: channel?.id,
      hasCredentials: !!channel?.credentials,
      credentialsId: channel?.credentials?.id,
      webhookVerifyToken: channel?.credentials?.webhookVerifyToken,
      webhookVerifyTokenLength: channel?.credentials?.webhookVerifyToken?.length || 0,
      webhookVerifyTokenType: typeof channel?.credentials?.webhookVerifyToken,
    });

    if (!channel) {
      throw new NotFoundError('WhatsApp channel not found');
    }

    if (!channel.credentials) {
      throw new BadRequestError('Channel credentials not configured');
    }

    // Check if this is a verification request (GET)
    if (Object.keys(queryParams).length > 0) {
      logger.info('✅ This is a webhook verification request', {
        mode: queryParams['hub.mode'],
        challenge: queryParams['hub.challenge'],
        tokenReceived: queryParams['hub.verify_token'],
        tokenStored: channel.credentials.webhookVerifyToken,
        credentialsObject: JSON.stringify(channel.credentials),
      });

      const provider = this.getProviderInstanceForVerification(channel, channel.credentials);
      const verification = provider.verifyWebhook(queryParams);
      return verification;
    }

    // For incoming messages, we need the access token
    if (!channel.credentials.encryptedAccessToken) {
      throw new BadRequestError('Channel access token not configured. Please configure the access token in the WhatsApp settings.');
    }

    // Create provider instance
    const provider = this.getProviderInstance(channel, channel.credentials);

    // Parse incoming message
    const message = provider.parseIncomingMessage(payload);
    if (!message) {
      // This is normal for status updates, don't log as warning
      return { success: true, type: 'status_update_or_non_text' };
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
        contentType: 'TEXT',
        externalProvider: channel.provider,
        externalMessageId: message.messageId,
        status: MessageStatus.DELIVERED,
      },
      include: {
        senderUser: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessageSenderType: SenderType.LEAD,
        messagesSinceLastAI: { increment: 1 }, // Track messages for AI policy
      },
    });

    // Enqueue AI analysis job
    logger.info({ conversationId: conversation.id, tenantId: channel.tenantId }, '🔍 Debug: About to enqueue AI job from WhatsApp Webhook');
    await aiJobProducer.enqueueConversationAnalysis(conversation.id, channel.tenantId);

    // Emit socket event for new message
    const io = getIO();
    io.to(`tenant:${channel.tenantId}`).emit('message:new', {
      conversationId: conversation.id,
      message: serialize(newMessage),
    });

    logger.info(
      { conversationId: conversation.id, messageId: newMessage.id },
      'Socket event emitted: message:new'
    );

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

    if (!channel || !channel.credentials || !channel.credentials.encryptedAccessToken) {
      throw new BadRequestError('No active WhatsApp channel configured with valid credentials');
    }

    // Create provider instance
    const provider = this.getProviderInstance(channel, channel.credentials);

    // Send via provider
    const result = await provider.sendMessage({
      to: conversation.lead.phone,
      text,
    });

    // If sending failed, throw error instead of creating a failed message
    if (result.status === 'failed') {
      throw new BadRequestError('Failed to send WhatsApp message. Please check your credentials.');
    }

    // Create message record
    const message = await prisma.message.create({
      data: {
        tenantId,
        conversationId,
        senderType: SenderType.AGENT,
        senderUserId: userId,
        contentText: text,
        contentType: 'TEXT',
        externalProvider: channel.provider,
        externalMessageId: result.messageId,
        status: result.status === 'sent' ? MessageStatus.SENT : MessageStatus.FAILED,
      },
      include: {
        senderUser: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessageSenderType: SenderType.AGENT,
        lastAgentReplyAt: new Date(),
        messagesSinceLastAI: { increment: 1 }, // Track messages for AI policy
      },
    });

    // Enqueue AI analysis job
    await queueJob('AI_ANALYZE_CONVERSATION', {
      tenantId,
      conversationId,
    });

    // Emit socket event for sent message
    const io = getIO();
    io.to(`tenant:${tenantId}`).emit('message:new', {
      conversationId,
      message: serialize(message),
    });

    logger.info(
      { conversationId, messageId: message.id },
      'Socket event emitted: message:sent'
    );

    return serialize(message);
  }

  /**
   * Get provider instance from channel and credentials
   */
  private getProviderInstance(
    channel: { provider: WhatsAppProvider; providerAccountId: string; phoneNumber: string },
    credentials: { encryptedAccessToken: string; encryptedSecret: string | null; webhookVerifyToken: string | null }
  ): IWhatsAppProvider {
    logger.info('🔐 Token from database:', {
      encryptedToken: credentials.encryptedAccessToken,
      encryptedTokenLength: credentials.encryptedAccessToken.length,
      hasColons: credentials.encryptedAccessToken.includes(':'),
      colonCount: credentials.encryptedAccessToken.split(':').length - 1,
    });

    // Check if token is actually encrypted (encrypted tokens have format: salt:iv:authTag:data)
    const isEncrypted = credentials.encryptedAccessToken.includes(':') &&
      credentials.encryptedAccessToken.split(':').length === 4;

    let accessToken: string;
    if (isEncrypted) {
      try {
        accessToken = decrypt(credentials.encryptedAccessToken).trim();
        logger.info('✅ Successfully decrypted access token');
      } catch (error) {
        logger.error('❌ Failed to decrypt access token, using as plain text', { error });
        accessToken = credentials.encryptedAccessToken.trim();
      }
    } else {
      // Token is stored in plain text
      logger.info('📝 Using plain text access token (not encrypted)');
      accessToken = credentials.encryptedAccessToken.trim();
    }

    const secret = credentials.encryptedSecret ? decrypt(credentials.encryptedSecret).trim() : '';

    logger.info('🔑 ACCESS TOKEN TO USE:', {
      accessToken: accessToken,
      tokenLength: accessToken.length,
      isEncrypted,
      first10Chars: accessToken.substring(0, 10),
      last10Chars: accessToken.substring(accessToken.length - 10),
    });

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

  /**
   * Get provider instance for webhook verification (doesn't need access token)
   */
  private getProviderInstanceForVerification(
    channel: { provider: WhatsAppProvider; providerAccountId: string; phoneNumber: string },
    credentials: { encryptedAccessToken: string | null; encryptedSecret: string | null; webhookVerifyToken: string | null }
  ): IWhatsAppProvider {
    if (channel.provider === WhatsAppProvider.META) {
      return new MetaWhatsAppProvider(
        '', // No access token needed for verification
        channel.providerAccountId,
        credentials.webhookVerifyToken || ''
      );
    } else if (channel.provider === WhatsAppProvider.TWILIO) {
      const secret = credentials.encryptedSecret ? decrypt(credentials.encryptedSecret) : '';
      return new TwilioWhatsAppProvider(
        channel.providerAccountId,
        secret,
        channel.phoneNumber
      );
    }

    throw new BadRequestError(`Unsupported provider: ${channel.provider}`);
  }

  /**
   * Toggle WhatsApp channel active status
   */
  async toggleChannelStatus(channelId: string, tenantId: string) {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: {
        id: channelId,
        tenantId,
      },
    });

    if (!channel) {
      throw new NotFoundError('WhatsApp channel not found');
    }

    const updated = await prisma.whatsAppChannel.update({
      where: { id: channelId },
      data: { isActive: !channel.isActive },
    });

    return serialize(updated);
  }

  /**
   * Delete WhatsApp channel
   */
  async deleteChannel(channelId: string, tenantId: string) {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: {
        id: channelId,
        tenantId,
      },
    });

    if (!channel) {
      throw new NotFoundError('WhatsApp channel not found');
    }

    // Delete credentials and channel in transaction
    await prisma.$transaction(async (tx) => {
      await tx.whatsAppCredential.deleteMany({
        where: { channelId },
      });
      await tx.whatsAppChannel.delete({
        where: { id: channelId },
      });
    });

    return { success: true };
  }

  /**
   * Get a specific channel by ID
   */
  async getChannelById(channelId: string, tenantId: string) {
    const channel = await prisma.whatsAppChannel.findFirst({
      where: {
        id: channelId,
        tenantId,
      },
    });

    if (!channel) {
      throw new NotFoundError('WhatsApp channel not found');
    }

    return serialize(channel);
  }
}

export const whatsAppService = new WhatsAppService();
