import { describe, it, expect, beforeEach } from 'vitest';
import { ApiTestHelper } from '../helpers/apiTestHelper.js';
import { TenantFactory, UserFactory } from '../factories/index.js';

describe('Auth Endpoints', () => {
  let apiHelper: ApiTestHelper;
  let tenant: Awaited<ReturnType<typeof TenantFactory.create>>;
  let admin: Awaited<ReturnType<typeof UserFactory.createAdmin>>;

  beforeEach(async () => {
    apiHelper = new ApiTestHelper();
    tenant = await TenantFactory.create({ slug: 'test-company' });
    admin = await UserFactory.createAdmin(tenant.id, {
      email: 'admin@test.com',
      password: 'password123',
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await apiHelper.getRawRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          token: expect.any(String),
          user: {
            id: admin.id,
            email: 'admin@test.com',
            role: 'TENANT_ADMIN',
            tenantId: tenant.id,
          },
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: 'test-company',
          },
        },
      });
    });

    it('should return 401 with invalid credentials', async () => {
      const response = await apiHelper.getRawRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          message: 'Invalid credentials',
        },
      });
    });

    it('should return 401 with non-existent email', async () => {
      const response = await apiHelper.getRawRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          message: 'Invalid credentials',
        },
      });
    });

    it('should return 400 with missing email', async () => {
      const response = await apiHelper.getRawRequest()
        .post('/api/v1/auth/login')
        .send({
          password: 'password123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should return 400 with invalid email format', async () => {
      const response = await apiHelper.getRawRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user info when authenticated', async () => {
      const { token } = await apiHelper.login('admin@test.com', 'password123');

      const response = await apiHelper
        .authenticatedGet('/api/v1/auth/me', token)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          id: admin.id,
          email: 'admin@test.com',
          role: 'TENANT_ADMIN',
          tenantId: tenant.id,
        },
      });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await apiHelper.getRawRequest()
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          message: 'No token provided',
        },
      });
    });

    it('should return 401 with invalid token', async () => {
      const response = await apiHelper.getRawRequest()
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          message: 'Invalid or expired token',
        },
      });
    });
  });
});
