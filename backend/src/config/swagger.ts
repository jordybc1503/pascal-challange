import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Multi-Tenant WhatsApp Messaging System API',
      version: '1.0.0',
      description: 'API REST para sistema de mensajería WhatsApp multi-tenant con análisis AI y gestión de leads',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.production.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido del endpoint /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Error message',
                },
                code: {
                  type: 'string',
                  example: 'ERROR_CODE',
                },
              },
            },
          },
        },
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'Acme Software Corp',
            },
            slug: {
              type: 'string',
              example: 'acme',
            },
            ruc: {
              type: 'string',
              nullable: true,
              example: '20123456789',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@acme.com',
            },
            role: {
              type: 'string',
              enum: ['TENANT_ADMIN', 'SALES_AGENT'],
              example: 'TENANT_ADMIN',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Lead: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            email: {
              type: 'string',
              format: 'email',
              nullable: true,
            },
            source: {
              type: 'string',
              example: 'whatsapp',
            },
            status: {
              type: 'string',
              enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'],
              example: 'NEW',
            },
            metadata: {
              type: 'object',
              nullable: true,
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            leadId: {
              type: 'string',
              format: 'uuid',
            },
            assignedToId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
              example: 'MEDIUM',
            },
            status: {
              type: 'string',
              enum: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
              example: 'OPEN',
            },
            aiTags: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['product-inquiry', 'pricing'],
            },
            aiSummary: {
              type: 'string',
              nullable: true,
            },
            lastMessageAt: {
              type: 'string',
              format: 'date-time',
            },
            lastAgentReplyAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            conversationId: {
              type: 'string',
              format: 'uuid',
            },
            senderId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            content: {
              type: 'string',
              example: 'Hello, I need information about your product',
            },
            direction: {
              type: 'string',
              enum: ['INBOUND', 'OUTBOUND'],
              example: 'INBOUND',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
              example: 'DELIVERED',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Endpoints de autenticación y autorización',
      },
      {
        name: 'Tenants',
        description: 'Gestión de compañías/tenants',
      },
      {
        name: 'Conversations',
        description: 'Gestión de conversaciones con leads',
      },
      {
        name: 'Messages',
        description: 'Gestión de mensajes',
      },
      {
        name: 'Dashboard',
        description: 'Métricas y estadísticas',
      },
      {
        name: 'WhatsApp',
        description: 'Configuración de canales WhatsApp',
      },
    ],
  },
  apis: ['./src/**/*.routes.ts', './src/**/*.controller.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
