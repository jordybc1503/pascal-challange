import {
  ApiResponseSchema,
  ApiErrorResponseSchema,
  AuthResponseSchema,
  UserSchema,
  ConversationSchema,
  MessageSchema,
  DashboardMetricsSchema,
  PaginatedResponseSchema,
  WhatsAppConfigResponseSchema,
  WhatsAppConfigListResponseSchema,
  UsersListResponseSchema,
  type AuthResponse,
  type User,
  type Conversation,
  type Message,
  type DashboardMetrics,
  type SendMessageData,
  type WhatsAppConfigFormData,
  type WhatsAppConfigResponse,
} from './schemas';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  if (authToken) return authToken;
  authToken = localStorage.getItem('auth_token');
  return authToken;
};

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  schema?: (data: unknown) => T
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorData = ApiErrorResponseSchema.safeParse(data);
    if (errorData.success) {
      throw new ApiError(
        errorData.data.error.message,
        response.status,
        errorData.data.error.code
      );
    }
    throw new ApiError('An error occurred', response.status);
  }

  if (schema) {
    return schema(data);
  }

  return data;
}

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetchApi<AuthResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      (data) => ApiResponseSchema(AuthResponseSchema).parse(data).data
    );
    setAuthToken(response.token);
    // Store tenant info
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenant', JSON.stringify(response.tenant));
    }
    return response;
  },

  me: async (): Promise<User> => {
    return fetchApi('/auth/me', {}, (data) =>
      ApiResponseSchema(UserSchema).parse(data).data
    );
  },

  logout: () => {
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tenant');
    }
  },
};

// Conversations API
export const conversationsApi = {
  list: async (params?: {
    priority?: string;
    tag?: string;
    search?: string;
    unreplied?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: Conversation[]; pagination: { nextCursor: string | null; hasNextPage: boolean } }> => {
    const searchParams = new URLSearchParams();
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.unreplied) searchParams.set('unreplied', 'true');
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    const endpoint = query ? `/conversations?${query}` : '/conversations';

    return fetchApi(endpoint, {}, (data) =>
      ApiResponseSchema(PaginatedResponseSchema(ConversationSchema)).parse(data).data
    );
  },

  getById: async (id: string): Promise<Conversation> => {
    return fetchApi(`/conversations/${id}`, {}, (data) =>
      ApiResponseSchema(ConversationSchema).parse(data).data
    );
  },

  assign: async (id: string, agentId: string | null): Promise<Conversation> => {
    return fetchApi(
      `/conversations/${id}/assign`,
      {
        method: 'POST',
        body: JSON.stringify({ agentId }),
      },
      (data) => ApiResponseSchema(ConversationSchema).parse(data).data
    );
  },
};

// Messages API
export const messagesApi = {
  list: async (
    conversationId: string,
    params?: { cursor?: string; limit?: number }
  ): Promise<{ items: Message[]; pagination: { nextCursor: string | null; hasNextPage: boolean } }> => {
    const searchParams = new URLSearchParams();
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    const endpoint = query
      ? `/conversations/${conversationId}/messages?${query}`
      : `/conversations/${conversationId}/messages`;

    return fetchApi(endpoint, {}, (data) =>
      ApiResponseSchema(PaginatedResponseSchema(MessageSchema)).parse(data).data
    );
  },

  send: async (conversationId: string, data: SendMessageData): Promise<Message> => {
    return fetchApi(
      `/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      (data) => ApiResponseSchema(MessageSchema).parse(data).data
    );
  },
};

// Dashboard API
export const dashboardApi = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    return fetchApi('/dashboard/metrics', {}, (data) =>
      ApiResponseSchema(DashboardMetricsSchema).parse(data).data
    );
  },
};

// WhatsApp API
export const whatsAppApi = {
  listConfigs: async (): Promise<WhatsAppConfigResponse[]> => {
    return fetchApi('/whatsapp/config', {}, (data) =>
      ApiResponseSchema(WhatsAppConfigListResponseSchema).parse(data).data
    );
  },

  getConfig: async (id: string): Promise<WhatsAppConfigResponse> => {
    return fetchApi(`/whatsapp/config/${id}`, {}, (data) =>
      ApiResponseSchema(WhatsAppConfigResponseSchema).parse(data).data
    );
  },

  saveConfig: async (config: WhatsAppConfigFormData): Promise<WhatsAppConfigResponse> => {
    return fetchApi('/whatsapp/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }, (data) => ApiResponseSchema(WhatsAppConfigResponseSchema).parse(data).data);
  },
};

// Users API
export const usersApi = {
  list: async (): Promise<User[]> => {
    return fetchApi('/users', {}, (data) =>
      ApiResponseSchema(UsersListResponseSchema).parse(data).data
    );
  },
};

export { ApiError };
