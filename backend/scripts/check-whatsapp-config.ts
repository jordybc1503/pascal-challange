import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking WhatsApp configurations...\n');

  const channels = await prisma.whatsAppChannel.findMany({
    include: {
      credentials: true,
      tenant: true,
    },
  });

  if (channels.length === 0) {
    console.log('❌ No WhatsApp channels found in database');
    return;
  }

  for (const channel of channels) {
    console.log('📱 Channel:', {
      id: channel.id,
      tenant: channel.tenant.name,
      provider: channel.provider,
      displayName: channel.displayName,
      phoneNumber: channel.phoneNumber,
      providerAccountId: channel.providerAccountId,
      isActive: channel.isActive,
    });

    if (channel.credentials) {
      console.log('🔑 Credentials:', {
        id: channel.credentials.id,
        hasAccessToken: !!channel.credentials.encryptedAccessToken,
        hasSecret: !!channel.credentials.encryptedSecret,
        webhookVerifyToken: channel.credentials.webhookVerifyToken || '(EMPTY)',
      });
    } else {
      console.log('❌ No credentials found for this channel');
    }
    console.log('---\n');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
