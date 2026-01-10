import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { prisma } from '../src/db/client.js';

// Setup before all tests
beforeAll(async () => {
  // Database is already connected via prisma client
  console.log('🧪 Test suite started');
});

// Cleanup after all tests
afterAll(async () => {
  await prisma.$disconnect();
  console.log('🧪 Test suite completed');
});

// Cleanup before each test
beforeEach(async () => {
  // Clean all tables in reverse order of dependencies
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.whatsAppCredential.deleteMany({});
  await prisma.whatsAppChannel.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
});

// Optional: cleanup after each test
afterEach(async () => {
  // Additional cleanup if needed
});
