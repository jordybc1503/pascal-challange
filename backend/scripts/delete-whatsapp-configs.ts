import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting all WhatsApp configurations...\n');

  // Delete credentials first (foreign key constraint)
  const deletedCredentials = await prisma.whatsAppCredential.deleteMany({});
  console.log(`✅ Deleted ${deletedCredentials.count} credentials`);

  // Then delete channels
  const deletedChannels = await prisma.whatsAppChannel.deleteMany({});
  console.log(`✅ Deleted ${deletedChannels.count} channels`);

  console.log('\n✨ All WhatsApp configurations have been deleted');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
