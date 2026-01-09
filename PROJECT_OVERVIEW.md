# 🚀 Messaging CRM - Full Stack Project

Sistema completo de mensajería estilo CRM con funcionalidades AI, tiempo real y arquitectura moderna.

## 📁 Estructura del Proyecto

```
pascal-challange/
├── backend/          # Node.js + Express + TypeScript + Prisma + Socket.IO
└── frontend/         # Next.js + React + TypeScript + TailwindCSS
```

## 🛠️ Stack Tecnológico

### Backend
- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** + **Prisma ORM**
- **Socket.IO** (tiempo real)
- **BullMQ** + **Redis** (job queue para AI)
- **JWT** (autenticación)
- **Zod** (validación)

### Frontend
- **Next.js 14** (App Router)
- **React 18** + **TypeScript**
- **TailwindCSS** (estilos)
- **TanStack Query** (server state)
- **Socket.IO Client** (tiempo real)
- **Zustand** (client state)
- **React Hook Form** + **Zod**

## 🚀 Quick Start

### Prerequisitos

- Node.js 18+
- Docker + Docker Compose (para PostgreSQL y Redis)
- npm o yarn

### 1. Setup Backend

```bash
cd backend

# Instalar dependencias
npm install

# Iniciar PostgreSQL y Redis con Docker
docker-compose up -d

# Configurar variables de entorno
cp .env.example .env
# Editar .env si es necesario (valores por defecto funcionan)

# Ejecutar migraciones de Prisma
npx prisma migrate dev

# (Opcional) Seed con datos de prueba
npx prisma db seed

# Iniciar servidor backend
npm run dev

# En otra terminal, iniciar worker de AI
npm run worker
```

Backend estará en: `http://localhost:3000`

### 2. Setup Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Los valores por defecto apuntan a localhost:3000

# Iniciar servidor de desarrollo
npm run dev
```

Frontend estará en: `http://localhost:3001`

### 3. Login

Usa las credenciales de prueba (si ejecutaste el seed):

**Admin:**
- Email: `admin@example.com`
- Password: `admin123`

**Sales Agent:**
- Email: `agent@example.com`
- Password: `agent123`

## 📚 Características Principales

### ✅ Backend

- 12 endpoints REST API (auth, conversations, messages, dashboard)
- 5 eventos Socket.IO (join/leave room, typing, new message, AI update)
- Sistema de roles (RBAC): Admin, Sales_Agent
- BullMQ worker con debouncing para AI analysis
- Cursor-based pagination
- Rate limiting y seguridad con Helmet
- Logging con Pino
- Seed script con 3 usuarios, 3 leads, 3 conversaciones

### ✅ Frontend

- Login y autenticación con JWT
- Inbox de 3 columnas: conversaciones, chat, panel de lead
- Filtros: búsqueda, prioridad, unreplied
- Real-time:
  - Nuevos mensajes
  - Typing indicators
  - AI updates (summary, priority, tags)
- Dashboard con métricas
- Infinite scroll en conversaciones y mensajes
- Responsive UI con TailwindCSS

## 📖 Documentación

### Backend
- [README](backend/README.md) - Documentación completa
- [QUICKSTART](backend/QUICKSTART.md) - Guía rápida
- [ARCHITECTURE](backend/ARCHITECTURE.md) - Arquitectura del sistema
- [STRUCTURE](backend/STRUCTURE.md) - Estructura de carpetas
- [API Examples](backend/examples/api-examples.http) - Ejemplos de endpoints

### Frontend
- [README](frontend/README.md) - Documentación completa

## 🧪 Testing

### Test Backend API

Puedes usar el archivo `backend/examples/api-examples.http` con la extensión REST Client de VS Code.

O con curl:

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Listar conversaciones (reemplaza TOKEN)
curl http://localhost:3000/api/v1/conversations \
  -H "Authorization: Bearer <TOKEN>"
```

### Test Socket.IO

Puedes usar el ejemplo en `backend/examples/socket-client.ts`:

```bash
cd backend
npx tsx examples/socket-client.ts
```

## 🐳 Docker

El proyecto incluye Docker Compose para PostgreSQL y Redis:

```bash
cd backend

# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Limpiar todo (incluyendo volúmenes)
docker-compose down -v
```

## 📊 Estructura de Base de Datos

4 tablas principales:

- **User**: Usuarios del sistema (admin, agents)
- **Lead**: Leads/clientes que envían mensajes
- **Conversation**: Conversación entre lead y agente
- **Message**: Mensajes individuales

Ver [backend/prisma/schema.prisma](backend/prisma/schema.prisma) para el schema completo.

## 🔑 Endpoints API Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | Usuario actual |
| GET | `/api/v1/conversations` | Listar conversaciones |
| GET | `/api/v1/conversations/:id` | Detalle de conversación |
| POST | `/api/v1/conversations/:id/assign` | Asignar a agente |
| GET | `/api/v1/conversations/:id/messages` | Listar mensajes |
| POST | `/api/v1/conversations/:id/messages` | Enviar mensaje |
| GET | `/api/v1/dashboard/metrics` | Métricas del dashboard |

## 🔌 Eventos Socket.IO

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `conversation:join` | Client → Server | Unirse a una conversación |
| `conversation:leave` | Client → Server | Salir de una conversación |
| `typing:start` | Client → Server | Empezar a escribir |
| `typing:stop` | Client → Server | Dejar de escribir |
| `message:new` | Server → Client | Nuevo mensaje |
| `conversation:ai:update` | Server → Client | Actualización de AI |
| `typing:start` | Server → Client | Otro usuario escribiendo |
| `typing:stop` | Server → Client | Otro usuario dejó de escribir |

## 🤖 AI Analysis (Simulado)

El worker de BullMQ procesa conversaciones y genera:
- **Summary**: Resumen de la conversación
- **Priority**: HIGH, MEDIUM, LOW
- **Tags**: Array de etiquetas relevantes

Actualmente es un **stub simulado**. Para integrar un LLM real:
1. Editar `backend/src/jobs/handlers/aiAnalysisHandler.ts`
2. Integrar con OpenAI, Anthropic, etc.
3. Usar el contenido de los mensajes para generar análisis real

## 🛣️ Roadmap

### Backend
- [ ] Integración con LLM real (OpenAI GPT-4, Claude, etc.)
- [ ] Tests unitarios y de integración
- [ ] GraphQL API como alternativa
- [ ] Webhooks para eventos externos
- [ ] Upload de archivos S3

### Frontend
- [ ] Tests con Vitest + RTL
- [ ] Dark mode completo
- [ ] Push notifications
- [ ] PWA support
- [ ] Búsqueda semántica

## 🤝 Contribuir

Este es un proyecto de demostración. Para mejoras:
1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/mejora`)
3. Commit (`git commit -am 'Add: nueva feature'`)
4. Push (`git push origin feature/mejora`)
5. Abre un Pull Request

## 📝 Licencia

MIT

## 👤 Autor

Proyecto generado como demostración de arquitectura full-stack moderna.

---

**Happy Coding! 🚀**
