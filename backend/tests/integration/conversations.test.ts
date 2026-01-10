import { describe, it, expect, beforeEach } from 'vitest';
import { ApiTestHelper } from '../helpers/apiTestHelper.js';
import {
  TenantFactory,
  UserFactory,
  LeadFactory,
  ConversationFactory,
  ScenarioFactory,
} from '../factories/index.js';
import { Priority } from '@prisma/client';

describe('Conversations Endpoints', () => {
  let apiHelper: ApiTestHelper;

  beforeEach(() => {
    apiHelper = new ApiTestHelper();
  });

  describe('GET /api/v1/conversations', () => {
    it('should return all conversations for tenant admin', async () => {
      const scenario = await ScenarioFactory.createCompleteScenario();
      const { token } = await apiHelper.login('admin@test.com', 'password123');

      const response = await apiHelper
        .authenticatedGet('/api/v1/conversations', token)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          items: expect.any(Array),
          pagination: {
            hasNextPage: false,
            nextCursor: null,
          },
        },
      });

      // Admin should see all 5 conversations
      expect(response.body.data.items).toHaveLength(5);

      // Each conversation should have the required structure
      const firstConv = response.body.data.items[0];
      expect(firstConv).toMatchObject({
        id: expect.any(String),
        tenantId: scenario.tenant.id,
        leadId: expect.any(String),
        status: expect.any(String),
        lead: {
          id: expect.any(String),
          name: expect.any(String),
        },
        _count: {
          messages: expect.any(Number),
        },
      });
    });

    it('should return only assigned conversations for sales agent', async () => {
      const scenario = await ScenarioFactory.createCompleteScenario();
      const { token } = await apiHelper.login('agent1@test.com', 'password123');

      const response = await apiHelper
        .authenticatedGet('/api/v1/conversations', token)
        .expect(200);

      expect(response.body.status).toBe('success');

      // Agent1 should see only conversations assigned to them (2 conversations)
      expect(response.body.data.items).toHaveLength(2);

      // All conversations should be assigned to agent1
      response.body.data.items.forEach((conv: any) => {
        expect(conv.assignedAgentId).toBe(scenario.agents[0].id);
      });
    });

    it('should filter conversations by priority', async () => {
      const scenario = await ScenarioFactory.createCompleteScenario();
      const { token } = await apiHelper.login('admin@test.com', 'password123');

      const response = await apiHelper
        .authenticatedGet('/api/v1/conversations?priority=HIGH', token)
        .expect(200);

      expect(response.body.status).toBe('success');

      // Should return only HIGH priority conversations (2)
      expect(response.body.data.items.length).toBeGreaterThan(0);
      response.body.data.items.forEach((conv: any) => {
        expect(conv.aiPriority).toBe('HIGH');
      });
    });

    it('should filter conversations by tag', async () => {
      const scenario = await ScenarioFactory.createCompleteScenario();
      const { token } = await apiHelper.login('admin@test.com', 'password123');

      const response = await apiHelper
        .authenticatedGet('/api/v1/conversations?tag=urgent', token)
        .expect(200);

      expect(response.body.status).toBe('success');

      // Each conversation should have the 'urgent' tag
      response.body.data.items.forEach((conv: any) => {
        expect(conv.aiTags).toContain('urgent');
      });
    });

    it('should filter unreplied conversations', async () => {
      const tenant = await TenantFactory.create();
      const admin = await UserFactory.createAdmin(tenant.id, {
        email: 'admin@unreplied.com',
        password: 'password123',
      });
      const lead = await LeadFactory.create(tenant.id);

      // Create conversation with agent reply
      await ConversationFactory.create(tenant.id, lead.id, {
        lastAgentReplyAt: new Date(),
      });

      // Create conversation without agent reply
      const lead2 = await LeadFactory.create(tenant.id);
      await ConversationFactory.create(tenant.id, lead2.id, {
        lastAgentReplyAt: null,
      });

      const { token } = await apiHelper.login('admin@unreplied.com', 'password123');

      const response = await apiHelper
        .authenticatedGet('/api/v1/conversations?unreplied=true', token)
        .expect(200);

      expect(response.body.status).toBe('success');

      // Should return only 1 unreplied conversation
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].lastAgentReplyAt).toBeNull();
    });

    it('should search conversations by lead name', async () => {
      const tenant = await TenantFactory.create();
      const admin = await UserFactory.createAdmin(tenant.id, {
        email: 'admin@search.com',
        password: 'password123',
      });

      const lead = await LeadFactory.create(tenant.id, { name: 'John Doe' });
      await ConversationFactory.create(tenant.id, lead.id);

      const lead2 = await LeadFactory.create(tenant.id, { name: 'Jane Smith' });
      await ConversationFactory.create(tenant.id, lead2.id);

      const { token } = await apiHelper.login('admin@search.com', 'password123');

      const response = await apiHelper
        .authenticatedGet('/api/v1/conversations?search=John', token)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].lead.name).toBe('John Doe');
    });

    it('should paginate results with cursor', async () => {
      const tenant = await TenantFactory.create();
      const admin = await UserFactory.createAdmin(tenant.id, {
        email: 'admin@pagination.com',
        password: 'password123',
      });

      // Create 25 conversations to test pagination (limit is 20)
      const leads = await LeadFactory.createMany(tenant.id, 25);
      for (const lead of leads) {
        await ConversationFactory.create(tenant.id, lead.id);
      }

      const { token } = await apiHelper.login('admin@pagination.com', 'password123');

      // First page
      const firstPage = await apiHelper
        .authenticatedGet('/api/v1/conversations?limit=10', token)
        .expect(200);

      expect(firstPage.body.data.items).toHaveLength(10);
      expect(firstPage.body.data.pagination.hasNextPage).toBe(true);
      expect(firstPage.body.data.pagination.nextCursor).toBeTruthy();

      // Second page using cursor
      const cursor = firstPage.body.data.pagination.nextCursor;
      const secondPage = await apiHelper
        .authenticatedGet(`/api/v1/conversations?limit=10&cursor=${cursor}`, token)
        .expect(200);

      expect(secondPage.body.data.items).toHaveLength(10);

      // Ensure no duplicate conversations
      const firstPageIds = firstPage.body.data.items.map((c: any) => c.id);
      const secondPageIds = secondPage.body.data.items.map((c: any) => c.id);
      const intersection = firstPageIds.filter((id: string) => secondPageIds.includes(id));
      expect(intersection).toHaveLength(0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await apiHelper.getRawRequest()
        .get('/api/v1/conversations')
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          message: 'No token provided',
        },
      });
    });

    it('should not return conversations from other tenants', async () => {
      // Create two separate tenants
      const tenant1 = await TenantFactory.create();
      const admin1 = await UserFactory.createAdmin(tenant1.id, {
        email: 'admin1@tenant1.com',
        password: 'password123',
      });
      const lead1 = await LeadFactory.create(tenant1.id);
      await ConversationFactory.create(tenant1.id, lead1.id);

      const tenant2 = await TenantFactory.create();
      const admin2 = await UserFactory.createAdmin(tenant2.id, {
        email: 'admin2@tenant2.com',
        password: 'password123',
      });
      const lead2 = await LeadFactory.create(tenant2.id);
      await ConversationFactory.create(tenant2.id, lead2.id);

      // Login as admin1
      const { token } = await apiHelper.login('admin1@tenant1.com', 'password123');

      const response = await apiHelper
        .authenticatedGet('/api/v1/conversations', token)
        .expect(200);

      // Should only see 1 conversation from tenant1
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].tenantId).toBe(tenant1.id);
    });
  });

  describe('GET /api/v1/conversations/:id', () => {
    it('should return conversation details', async () => {
      const tenant = await TenantFactory.create();
      const admin = await UserFactory.createAdmin(tenant.id, {
        email: 'admin@details.com',
        password: 'password123',
      });
      const lead = await LeadFactory.create(tenant.id);
      const conversation = await ConversationFactory.createWithMessages(
        tenant.id,
        lead.id,
        3
      );

      const { token } = await apiHelper.login('admin@details.com', 'password123');

      const response = await apiHelper
        .authenticatedGet(`/api/v1/conversations/${conversation!.id}`, token)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          id: conversation!.id,
          leadId: lead.id,
          tenantId: tenant.id,
          lead: {
            id: lead.id,
            name: lead.name,
          },
        },
      });
    });

    it('should return 404 for non-existent conversation', async () => {
      const tenant = await TenantFactory.create();
      const admin = await UserFactory.createAdmin(tenant.id, {
        email: 'admin@notfound.com',
        password: 'password123',
      });

      const { token } = await apiHelper.login('admin@notfound.com', 'password123');

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await apiHelper
        .authenticatedGet(`/api/v1/conversations/${fakeId}`, token)
        .expect(404);

      expect(response.body.status).toBe('error');
    });

    it('should return 403 when agent tries to access unassigned conversation', async () => {
      const tenant = await TenantFactory.create();
      const agent = await UserFactory.createAgent(tenant.id, {
        email: 'agent@forbidden.com',
        password: 'password123',
      });
      const lead = await LeadFactory.create(tenant.id);

      // Create unassigned conversation
      const conversation = await ConversationFactory.create(tenant.id, lead.id, {
        assignedAgentId: null,
      });

      const { token } = await apiHelper.login('agent@forbidden.com', 'password123');

      const response = await apiHelper
        .authenticatedGet(`/api/v1/conversations/${conversation.id}`, token)
        .expect(403);

      expect(response.body.status).toBe('error');
    });
  });
});
