import { prisma } from '../src/db/client.js';
import { logger } from '../src/utils/logger.js';

/**
 * Configure AI for a tenant
 * Usage: npm run setup-ai <tenantSlug>
 */
async function setupAI() {
  const tenantSlug = process.argv[2] || 'acme';

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) {
    logger.error(`Tenant with slug "${tenantSlug}" not found`);
    process.exit(1);
  }

  // Configure Gemini AI with your API key
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      aiConfig: {
        provider: 'gemini',
        apiKey: 'AIzaSyCVBCRGmxeFkKRGBG1kHu1mKvtJRbF4Jw4',
        model: 'gemini-1.5-flash',
        updatePolicy: {
          mode: 'EVERY_N_MESSAGES',
          n: 3, // Analyze after every 3 messages
        },
      },
    },
  });

  logger.info('✅ AI configured for tenant', {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    updatePolicy: 'EVERY_N_MESSAGES (n=3)',
  });

  await prisma.$disconnect();
}

setupAI().catch((error) => {
  logger.error('Failed to setup AI', { error });
  process.exit(1);
});
