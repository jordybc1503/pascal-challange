# Testing Guide

## Overview

This backend project uses **Vitest** as the test runner, **Supertest** for API testing, and **@faker-js/faker** with factory patterns for generating test data.

## Structure

```
tests/
├── setup.ts                    # Global test setup and teardown
├── factories/
│   └── index.ts               # Data factories for all models
├── helpers/
│   ├── apiTestHelper.ts       # Helper for API requests
│   └── testUtils.ts           # General test utilities
└── integration/
    ├── auth.test.ts           # Auth endpoint tests
    └── conversations.test.ts  # Conversations endpoint tests
```

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with UI (browser-based test viewer)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Writing Tests

### Using Factories

Factories make it easy to create test data:

```typescript
import {
  TenantFactory,
  UserFactory,
  ConversationFactory,
  ScenarioFactory
} from '@tests/factories';

// Create a tenant
const tenant = await TenantFactory.create();

// Create an admin user
const admin = await UserFactory.createAdmin(tenant.id, {
  email: 'admin@test.com',
  password: 'password123',
});

// Create multiple leads
const leads = await LeadFactory.createMany(tenant.id, 5);

// Create a conversation with messages
const conversation = await ConversationFactory.createWithMessages(
  tenant.id,
  leadId,
  5 // number of messages
);

// Create a complete test scenario
const scenario = await ScenarioFactory.createCompleteScenario();
// Returns: { tenant, admin, agents, leads, conversations }
```

### Using API Test Helper

Simplify API testing with the helper:

```typescript
import { ApiTestHelper } from '@tests/helpers/apiTestHelper';

const apiHelper = new ApiTestHelper();

// Login and get token
const { token, user } = await apiHelper.login('admin@test.com', 'password123');

// Make authenticated requests
const response = await apiHelper.authenticatedGet('/api/v1/conversations', token);

// Or use raw supertest
const response = await apiHelper.getRawRequest()
  .post('/api/v1/auth/login')
  .send({ email, password })
  .expect(200);
```

### Test Example

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ApiTestHelper } from '../helpers/apiTestHelper';
import { TenantFactory, UserFactory } from '../factories';

describe('My Feature', () => {
  let apiHelper: ApiTestHelper;

  beforeEach(async () => {
    apiHelper = new ApiTestHelper();
    // Database is automatically cleaned before each test
  });

  it('should do something', async () => {
    // Arrange
    const tenant = await TenantFactory.create();
    const user = await UserFactory.createAdmin(tenant.id);

    // Act
    const { token } = await apiHelper.login(user.email, user.password);
    const response = await apiHelper.authenticatedGet('/api/v1/endpoint', token);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
  });
});
```

## Available Factories

### TenantFactory
- `create(overrides?)` - Create a single tenant
- `createMany(count)` - Create multiple tenants

### UserFactory
- `create(tenantId, overrides?)` - Create a user
- `createAdmin(tenantId, overrides?)` - Create admin user
- `createAgent(tenantId, overrides?)` - Create sales agent

### LeadFactory
- `create(tenantId, overrides?)` - Create a lead
- `createMany(tenantId, count)` - Create multiple leads

### ConversationFactory
- `create(tenantId, leadId, overrides?)` - Create conversation
- `createWithMessages(tenantId, leadId, messageCount, overrides?)` - Create with messages

### MessageFactory
- `create(conversationId, overrides?)` - Create a message
- `createMany(conversationId, count)` - Create multiple messages

### ScenarioFactory
- `createCompleteScenario()` - Creates a full test scenario with:
  - 1 tenant
  - 1 admin
  - 2 sales agents
  - 5 leads
  - 5 conversations (mixed priorities, assignments)

## Best Practices

1. **Use factories** instead of manually creating records
2. **Clean database** is automatic via `beforeEach` in setup.ts
3. **Test isolation** - each test should be independent
4. **Meaningful test names** - describe what is being tested
5. **AAA pattern** - Arrange, Act, Assert
6. **Test edge cases** - not just happy paths
7. **Check tenant isolation** - verify multi-tenancy works

## Coverage

Generate coverage report:
```bash
npm run test:coverage
```

View HTML report at `coverage/index.html`

## Common Test Patterns

### Testing Authentication
```typescript
const { token } = await apiHelper.login(email, password);
```

### Testing Authorization
```typescript
// Test admin can access
const adminToken = await apiHelper.login('admin@test.com', 'password');
await apiHelper.authenticatedGet('/admin-endpoint', adminToken).expect(200);

// Test agent cannot access
const agentToken = await apiHelper.login('agent@test.com', 'password');
await apiHelper.authenticatedGet('/admin-endpoint', agentToken).expect(403);
```

### Testing Multi-Tenancy
```typescript
const tenant1 = await TenantFactory.create();
const tenant2 = await TenantFactory.create();

// Verify tenant1 cannot see tenant2's data
const { token } = await apiHelper.login('admin@tenant1.com', 'password');
const response = await apiHelper.authenticatedGet('/api/v1/conversations', token);

expect(response.body.data.items.every(c => c.tenantId === tenant1.id)).toBe(true);
```

### Testing Pagination
```typescript
// Create more items than page limit
const leads = await LeadFactory.createMany(tenant.id, 25);

// Test first page
const page1 = await apiHelper.authenticatedGet('/api/v1/items?limit=10', token);
expect(page1.body.data.pagination.hasNextPage).toBe(true);

// Test second page
const cursor = page1.body.data.pagination.nextCursor;
const page2 = await apiHelper.authenticatedGet(`/api/v1/items?cursor=${cursor}`, token);
```
