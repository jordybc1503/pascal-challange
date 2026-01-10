import supertest from 'supertest';
import express from 'express';
import { app } from '@/app.js';

/**
 * Create a test client with supertest
 */
export function createTestClient() {
  return supertest(app);
}

/**
 * Common API test helpers
 */
export class ApiTestHelper {
  private request: supertest.SuperTest<supertest.Test>;

  constructor() {
    this.request = createTestClient();
  }

  /**
   * Login and get token
   */
  async login(email: string, password: string) {
    const response = await this.request
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      token: response.body.data.token,
      user: response.body.data.user,
      tenant: response.body.data.tenant,
    };
  }

  /**
   * Make authenticated GET request
   */
  async authenticatedGet(url: string, token: string) {
    return this.request
      .get(url)
      .set('Authorization', `Bearer ${token}`);
  }

  /**
   * Make authenticated POST request
   */
  async authenticatedPost(url: string, token: string, body?: any) {
    return this.request
      .post(url)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  /**
   * Make authenticated PUT request
   */
  async authenticatedPut(url: string, token: string, body?: any) {
    return this.request
      .put(url)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  /**
   * Make authenticated DELETE request
   */
  async authenticatedDelete(url: string, token: string) {
    return this.request
      .delete(url)
      .set('Authorization', `Bearer ${token}`);
  }

  /**
   * Get the raw supertest request
   */
  getRawRequest() {
    return this.request;
  }
}
