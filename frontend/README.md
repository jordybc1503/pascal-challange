# Messaging Frontend

Frontend de Next.js + React + TypeScript para el sistema de mensajería CRM con funcionalidades AI.

## Stack Tecnológico

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript** (strict mode)
- **TailwindCSS** - Estilos
- **TanStack Query** - Server state management
- **Socket.IO Client** - Real-time messaging
- **Zustand** - Client state (auth)
- **React Hook Form** + **Zod** - Formularios y validación
- **Sonner** - Toast notifications
- **Lucide React** - Iconos

## Características

✅ **Login y autenticación** con JWT
✅ **Inbox de 3 columnas**: Lista de conversaciones, chat en tiempo real, panel de lead
✅ **Filtros avanzados**: Búsqueda, prioridad, unreplied
✅ **Real-time updates** vía Socket.IO:
  - Nuevos mensajes
  - Typing indicators
  - Actualizaciones de AI (summary, priority, tags)
✅ **Dashboard** con métricas y breakdown de prioridades
✅ **Infinite scroll** en conversaciones y mensajes
✅ **Responsive UI** con TailwindCSS

## Estructura del Proyecto

```
frontend/
├── app/
│   ├── (app)/                  # Rutas protegidas
│   │   ├── layout.tsx          # Layout con sidebar
│   │   ├── inbox/page.tsx      # Página de inbox (3 columnas)
│   │   └── dashboard/page.tsx  # Dashboard con métricas
│   ├── login/page.tsx          # Página de login
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Redirect a /inbox
│   └── globals.css             # Estilos globales
├── components/
│   ├── ConversationListItem.tsx
│   ├── FilterBar.tsx
│   ├── MessageBubble.tsx
│   ├── MessageComposer.tsx
│   ├── LeadPanel.tsx
│   ├── PriorityBadge.tsx
│   ├── TagList.tsx
│   ├── Skeletons.tsx
│   └── EmptyState.tsx
├── hooks/
│   ├── useAuth.ts              # Zustand store para auth
│   ├── useConversations.ts     # React Query hooks
│   ├── useMessages.ts
│   ├── useSocketRoom.ts        # Hook para Socket.IO rooms
│   └── useDashboard.ts
├── lib/
│   ├── api.ts                  # API client con fetch
│   ├── socket.ts               # Socket.IO client singleton
│   ├── schemas.ts              # Zod schemas + TypeScript types
│   ├── queryClient.ts          # TanStack Query config
│   └── utils.ts                # Helpers (cn, formatTime, etc.)
├── providers/
│   ├── QueryProvider.tsx
│   └── AuthProvider.tsx        # Auth initializer + RequireAuth
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── .env.local.example
```

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.local.example .env.local

# Editar .env.local con los valores correctos:
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3000

# 3. Ejecutar en modo desarrollo
npm run dev

# El frontend estará disponible en http://localhost:3001
```

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL del backend REST API | `http://localhost:3000/api/v1` |
| `NEXT_PUBLIC_WS_URL` | URL del backend WebSocket | `http://localhost:3000` |

## Uso

### Login

Usa las credenciales de prueba (del seed del backend):

```
Admin:
- Email: admin@example.com
- Password: admin123

Sales Agent:
- Email: agent@example.com
- Password: agent123
```

### Inbox

1. **Lista de conversaciones** (columna izquierda):
   - Filtra por prioridad, búsqueda, unreplied
   - Scroll infinito para cargar más
   - Badge azul indica unreplied messages

2. **Chat en tiempo real** (columna central):
   - Mensajes en tiempo real con Socket.IO
   - Typing indicators
   - Composer con Shift+Enter para nueva línea

3. **Panel de lead** (columna derecha):
   - Información del lead
   - AI analysis (summary, priority, tags)
   - Assigned agent

### Dashboard

- Total de conversaciones
- Unreplied messages
- Priority breakdown con gráficos

## Arquitectura Frontend

### State Management

- **Server State**: TanStack Query (conversaciones, mensajes, métricas)
- **Client State**: Zustand (auth)
- **Real-time**: Socket.IO (mensajes nuevos, typing, AI updates)

### Auth Flow

1. Login → obtiene JWT token
2. Token guardado en `localStorage` + Zustand store
3. Token enviado en header `Authorization: Bearer <token>`
4. Socket.IO usa el mismo token para autenticación
5. `RequireAuth` wrapper protege rutas

### Real-time Flow

1. Al seleccionar conversación → `socket.joinConversation(id)`
2. Socket.IO emite eventos:
   - `message:new` → agrega mensaje a cache de React Query
   - `conversation:ai:update` → actualiza AI metadata
   - `typing:start/stop` → muestra indicador
3. Al cambiar de conversación → `socket.leaveConversation(oldId)`

### API Client

- `lib/api.ts` exporta módulos: `authApi`, `conversationsApi`, `messagesApi`, `dashboardApi`
- Usa Zod para validar respuestas del servidor
- Maneja errores con `ApiError` custom class

## Scripts

```bash
npm run dev          # Modo desarrollo (port 3001)
npm run build        # Build para producción
npm run start        # Ejecutar build de producción
npm run lint         # ESLint
npm run type-check   # TypeScript check sin compilar
```

## Integración con Backend

El frontend espera que el backend esté corriendo en `http://localhost:3000`.

Ver `/backend/README.md` para instrucciones de setup del backend.

## Próximos Pasos

- [ ] Tests con Vitest + React Testing Library
- [ ] Modo oscuro completo
- [ ] Notificaciones de navegador (Push API)
- [ ] Upload de archivos/imágenes en mensajes
- [ ] Búsqueda semántica de mensajes
- [ ] Exportar conversaciones a PDF/CSV

## Notas Técnicas

- **App Router**: Usa el nuevo sistema de rutas de Next.js 14
- **Client Components**: Todos los componentes con interacción son `'use client'`
- **TypeScript Strict**: Tipos completos para todas las entidades
- **Infinite Scroll**: Usa `useInfiniteQuery` con cursor-based pagination
- **Socket.IO Singleton**: Un solo cliente compartido en toda la app
