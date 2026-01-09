# Cambios en Autenticación - Multi-tenant Simplificado

## Resumen de Cambios

Se ha actualizado el sistema de autenticación para **simplificar el login**. Ahora el usuario solo necesita proporcionar **email y contraseña**, eliminando el requisito del `tenantSlug`.

## 🔐 Login Actualizado

### Antes
```json
POST /api/v1/auth/login
{
  "email": "admin@acme.com",
  "password": "password123",
  "tenantSlug": "acme"  ← Ya no es necesario
}
```

### Ahora
```json
POST /api/v1/auth/login
{
  "email": "admin@acme.com",
  "password": "password123"
}
```

### Respuesta
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "admin@acme.com",
      "role": "TENANT_ADMIN",
      "tenantId": "uuid",
      "createdAt": "2026-01-09T12:00:00.000Z"
    },
    "tenant": {
      "id": "uuid",
      "name": "Acme Software Corp",
      "slug": "acme"
    }
  }
}
```

## 🏢 Crear Nueva Compañía/Tenant

El endpoint para crear nuevas compañías está **disponible públicamente** (no requiere autenticación):

```http
POST http://localhost:3000/api/v1/tenants
Content-Type: application/json

{
  "name": "Mi Empresa SAS",
  "slug": "mi-empresa",
  "adminEmail": "admin@miempresa.com",
  "adminPassword": "securePassword123"
}
```

### Respuesta al Crear Tenant
```json
{
  "status": "success",
  "data": {
    "tenant": {
      "id": "uuid",
      "name": "Mi Empresa SAS",
      "slug": "mi-empresa",
      "createdAt": "2026-01-09T12:00:00.000Z"
    },
    "admin": {
      "id": "uuid",
      "email": "admin@miempresa.com",
      "role": "TENANT_ADMIN",
      "tenantId": "uuid"
    }
  }
}
```

## 📝 Validaciones

### Campo `slug` (Identificador de la compañía)
- Mínimo 2 caracteres
- Solo letras minúsculas, números y guiones
- Ejemplo válido: `mi-empresa`, `acme`, `techstart-2024`
- Ejemplo inválido: `Mi Empresa`, `ACME`, `tech_start`

### Campo `name` (Nombre de la compañía)
- Mínimo 1 carácter
- Sin restricciones de formato
- Ejemplo: `"Mi Empresa SAS"`, `"Acme Software Corp"`

### Credenciales del Admin
- Email: Formato válido de email
- Password: Mínimo 8 caracteres

## 🎯 Cómo Funciona

1. **Login sin tenant**: El sistema busca el usuario por email en todas las compañías
2. **Auto-identificación**: Automáticamente identifica a qué compañía pertenece el usuario
3. **Respuesta completa**: Devuelve tanto el token JWT como la información del tenant
4. **Aislamiento**: Todas las operaciones posteriores están automáticamente aisladas por tenant

## 🧪 Cuentas de Prueba

Existen dos compañías de prueba pre-creadas:

### Acme Software Corp
- Email: `admin@acme.com`
- Password: `password123`

### TechStart Solutions
- Email: `admin@techstart.com`
- Password: `password123`

## 📦 Archivos Modificados

### Backend
- ✅ `src/modules/auth/auth.schema.ts` - Removido `tenantSlug` del loginSchema
- ✅ `src/modules/auth/auth.service.ts` - Login busca usuario por email en todos los tenants
- ✅ `src/modules/auth/auth.controller.ts` - Controller actualizado
- ✅ `examples/api-examples.http` - Ejemplos actualizados

### Frontend
- ✅ `lib/schemas.ts` - Removido `tenantSlug` del LoginSchema
- ✅ `lib/api.ts` - authApi.login() sin tenantSlug
- ✅ `hooks/useAuth.ts` - login() actualizado
- ✅ `app/login/page.tsx` - Formulario sin campo Company ID

## 🚀 Uso en Desarrollo

### Crear una nueva compañía
```bash
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nueva Empresa",
    "slug": "nueva-empresa",
    "adminEmail": "admin@nueva.com",
    "adminPassword": "password123"
  }'
```

### Login con la nueva compañía
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nueva.com",
    "password": "password123"
  }'
```

## ⚠️ Importante

- El email debe ser **único por compañía** (no globalmente único)
- Cada compañía tiene su propio conjunto de usuarios
- El sistema automáticamente identifica el tenant basado en el email del usuario
- Si un email existe en múltiples tenants, se usa el primer registro encontrado

## 🔄 Migración

Si ya tienes usuarios autenticados:
1. Haz logout en el frontend
2. Vuelve a hacer login con solo email y contraseña
3. El sistema automáticamente identificará tu compañía
