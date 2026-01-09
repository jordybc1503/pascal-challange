# Messaging System Backend

Backend completo para un sistema de mensajería con funcionalidades LLM (resumen AI, tags, prioridad) y tiempo real.

## 🚀 Stack Tecnológico

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Tiempo Real**: Socket.IO
- **Cola de Jobs**: BullMQ + Redis
- **Autenticación**: JWT + bcrypt
- **Validación**: Zod
- **Seguridad**: helmet, cors, rate-limiting
- **Logging**: Pino

## 📋 Requisitos Previos

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6

## 🛠️ Instalación

1. **Clonar y navegar al directorio**

```bash
cd backend
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/messaging_db
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-here
```

4. **Ejecutar migraciones de Prisma**

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. **Iniciar servidor de desarrollo**

```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: AI Worker
npm run worker
```

## 📁 Estructura del Proyecto

```
backend/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
├── src/
│   ├── config/
│   │   └── env.ts            # Configuración de variables de entorno
│   ├── db/
│   │   └── client.ts         # Cliente de Prisma
│   ├── middlewares/
│   │   ├── auth.ts           # Autenticación JWT
│   │   ├── rbac.ts           # Control de acceso basado en roles
│   │   ├── validate.ts       # Validación con Zod
│   │   └── errorHandler.ts  # Manejo global de errores
│   ├── modules/
│   │   ├── auth/             # Módulo de autenticación
│   │   ├── conversations/    # Módulo de conversaciones
│   │   ├── messages/         # Módulo de mensajes
│   │   ├── dashboard/        # Módulo de dashboard
│   │   └── ai/               # Módulo de análisis AI
│   ├── sockets/
│   │   ├── socket.ts         # Configuración de Socket.IO
│   │   └── events.ts         # Emisores de eventos
│   ├── jobs/
│   │   ├── queue.ts          # Configuración de BullMQ
│   │   ├── producer.ts       # Productor de jobs
│   │   ├── worker.ts         # Worker de jobs
│   │   └── redis.ts          # Conexión a Redis
│   ├── utils/
│   │   ├── logger.ts         # Logger con Pino
│   │   ├── errors.ts         # Clases de error
│   │   └── response.ts       # Helpers de respuesta
│   ├── app.ts                # Aplicación Express
│   ├── server.ts             # Servidor HTTP + Socket.IO
│   └── worker.ts             # Proceso worker separado
├── package.json
├── tsconfig.json
└── .env.example
```

## 🔐 Autenticación

### Registro

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "agent@example.com",
  "password": "password123",
  "role": "SALES_AGENT"  // opcional: ADMIN | SALES_AGENT
}
```

### Login

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "agent@example.com",
  "password": "password123"
}
```

Respuesta:

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "agent@example.com",
      "role": "SALES_AGENT"
    }
  }
}
```

### Obtener perfil

```bash
GET /api/v1/auth/me
Authorization: Bearer {token}
```

## 💬 API de Conversaciones

### Listar conversaciones

```bash
GET /api/v1/conversations
Authorization: Bearer {token}

# Query params opcionales:
# - priority: HIGH | MEDIUM | LOW
# - tag: string
# - search: string
# - limit: number (default: 20)
# - cursor: string (para paginación)
```

### Obtener conversación por ID

```bash
GET /api/v1/conversations/:id
Authorization: Bearer {token}
```

### Asignar conversación (solo ADMIN)

```bash
POST /api/v1/conversations/:id/assign
Authorization: Bearer {token}
Content-Type: application/json

{
  "agentId": "uuid-del-agente"  // null para desasignar
}
```

## 📨 API de Mensajes

### Listar mensajes de una conversación

```bash
GET /api/v1/conversations/:id/messages
Authorization: Bearer {token}

# Query params opcionales:
# - limit: number (default: 50)
# - cursor: string (para paginación)
```

### Enviar mensaje

```bash
POST /api/v1/conversations/:id/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "contentText": "Hola, ¿cómo puedo ayudarte?",
  "contentType": "TEXT",  // opcional: TEXT | IMAGE | FILE | AUDIO | VIDEO
  "mediaUrl": null        // opcional: URL del archivo multimedia
}
```

**Comportamiento:**
- Guarda el mensaje en la base de datos
- Emite evento `message:new` por Socket.IO
- Encola job de análisis AI (con debounce de 10s)

## 📊 Dashboard

### Obtener métricas

```bash
GET /api/v1/dashboard/metrics
Authorization: Bearer {token}
```

Respuesta:

```json
{
  "status": "success",
  "data": {
    "totalConversations": 150,
    "totalUnreplied": 12,
    "priorityBreakdown": {
      "high": 8,
      "medium": 45,
      "low": 97,
      "unanalyzed": 0
    }
  }
}
```

**RBAC:**
- `ADMIN`: Ve todas las conversaciones
- `SALES_AGENT`: Solo ve sus conversaciones asignadas

## 🔌 Socket.IO

### Conexión

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Conectado');
});
```

### Eventos del Cliente

```javascript
// Unirse a una sala de conversación
socket.emit('conversation:join', conversationId);

// Salir de una sala
socket.emit('conversation:leave', conversationId);

// Indicadores de escritura
socket.emit('typing:start', conversationId);
socket.emit('typing:stop', conversationId);
```

### Eventos del Servidor

```javascript
// Nuevo mensaje
socket.on('message:new', (data) => {
  console.log('Nuevo mensaje:', data.message);
});

// Actualización de AI
socket.on('conversation:ai:update', (data) => {
  console.log('AI actualizado:', data.aiData);
  // { summary, priority, tags, updatedAt }
});

// Alguien está escribiendo
socket.on('typing:start', (data) => {
  console.log(`${data.email} está escribiendo...`);
});

socket.on('typing:stop', (data) => {
  console.log(`${data.email} dejó de escribir`);
});
```

## 🤖 Sistema de Jobs AI

### Flujo de Análisis

1. **Trigger**: Se envía un mensaje → se encola job `AI_ANALYZE_CONVERSATION`
2. **Debouncing**: Si llegan varios mensajes en 10s, solo se analiza una vez
3. **Worker**: Toma los últimos 30 mensajes de la conversación
4. **Análisis**: Llama a `analyzeConversation()` (actualmente stub)
5. **Actualización**: Guarda `summary`, `priority`, `tags` en la DB
6. **Notificación**: Emite evento `conversation:ai:update` por Socket.IO

### Integrar LLM Real

Edita `src/modules/ai/analyzer.ts`:

```typescript
// Descomenta y configura el código de ejemplo con OpenAI
// O implementa tu propio proveedor (Anthropic, Cohere, etc.)

import OpenAI from 'openai';
import { config } from '../../config/env.js';

const openai = new OpenAI({ apiKey: config.ai.apiKey });

export async function analyzeConversation(messages: ConversationMessage[]): Promise<AIAnalysisResult> {
  const prompt = `Analiza la siguiente conversación y devuelve JSON:
  {
    "summary": "resumen breve (max 200 chars)",
    "priority": "high" | "medium" | "low",
    "tags": ["tag1", "tag2"]
  }

  Mensajes:
  ${messages.map(m => `[${m.senderType}]: ${m.contentText}`).join('\n')}`;

  const response = await openai.chat.completions.create({
    model: config.ai.model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

## 🔒 RBAC (Control de Acceso)

### Roles

- **ADMIN**: Acceso total, puede asignar conversaciones
- **SALES_AGENT**: Solo ve conversaciones asignadas

### Aplicación

```typescript
// Middleware requireRole
import { requireRole } from './middlewares/rbac.js';
import { UserRole } from '@prisma/client';

router.post(
  '/conversations/:id/assign',
  authenticate,
  requireRole(UserRole.ADMIN),  // Solo admins
  controller.assign
);
```

## 📝 Scripts Disponibles

```bash
npm run dev            # Servidor en modo desarrollo
npm run worker         # Worker en modo desarrollo
npm run build          # Compilar TypeScript
npm start              # Servidor en producción
npm run worker:prod    # Worker en producción
npm run prisma:generate # Generar cliente de Prisma
npm run prisma:migrate  # Ejecutar migraciones
npm run prisma:studio   # Abrir Prisma Studio
```

## 🧪 Crear Datos de Prueba

```sql
-- Crear usuarios
INSERT INTO users (id, email, password_hash, role) VALUES
  (gen_random_uuid(), 'admin@test.com', '$2b$10$...', 'ADMIN'),
  (gen_random_uuid(), 'agent@test.com', '$2b$10$...', 'SALES_AGENT');

-- Crear leads
INSERT INTO leads (id, name, email, phone) VALUES
  (gen_random_uuid(), 'John Doe', 'john@example.com', '+1234567890');

-- Crear conversación
INSERT INTO conversations (id, lead_id, assigned_agent_id) VALUES
  (gen_random_uuid(), '<lead-id>', '<agent-id>');
```

O usa Prisma Studio:

```bash
npm run prisma:studio
```

## 🐛 Debugging

### Ver logs

```bash
# Los logs se muestran en la consola con formato pretty en desarrollo
# En producción, se generan en formato JSON
```

### Ver jobs en Redis

```bash
redis-cli
> KEYS *
> HGETALL bull:ai-analysis:*
```

## 🚀 Deployment

### Variables de Entorno Producción

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_HOST=redis-prod.example.com
JWT_SECRET=super-secure-secret
AI_API_KEY=sk-...
```

### Build y Start

```bash
npm run build
npm start         # Terminal 1: API
npm run worker:prod  # Terminal 2: Worker
```

### Docker (ejemplo)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
RUN npx prisma generate

# Server
CMD ["npm", "start"]

# Worker (separar imagen o usar docker-compose)
# CMD ["npm", "run", "worker:prod"]
```

## 📚 Próximos Pasos

- [ ] Integrar LLM real (OpenAI, Anthropic)
- [ ] Añadir tests (Jest, Supertest)
- [ ] Implementar módulo de Leads completo
- [ ] Añadir webhooks para notificaciones externas
- [ ] Implementar búsqueda full-text (PostgreSQL FTS o Elasticsearch)
- [ ] Añadir métricas y monitoreo (Prometheus, Grafana)
- [ ] Implementar cache con Redis
- [ ] Añadir soporte para archivos adjuntos (S3, Cloudinary)

## 📄 Licencia

MIT

## 👤 Autor

Backend Engineer
