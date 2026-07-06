# Arquitectura — Order Express

> **[Portada](./documento.md)** · **Arquitectura** · [Datos](./datos.md) · [Módulos UI](./modulos-ui.md) · [Operaciones y recursos](./operaciones.md) · [Mantenimiento](./mantenimiento.md) · [Inteligencia artificial](./ia.md)
>
> Cómo está armado el proyecto: stack, estructura, configuración base y el sistema de autenticación por roles.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.9 — App Router + Turbopack |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth + tabla `user_roles` propia |
| Cliente Supabase | `@supabase/ssr` → `createBrowserClient` (sesión en cookies + localStorage) |
| Estilos | Inline styles únicamente — sin Tailwind, sin styled-jsx |
| Imágenes | Supabase Storage, bucket `productos` — convertidas a WebP en navegador vía Canvas API |
| Despliegue | Vercel — rama `master` del repo `Talkies-4estrellas/nube-store` |

---

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Si faltan, `lib/supabase.ts` devuelve un mock que no rompe el build, y `middleware.ts` deja pasar la petición sin autenticar (guarda temprana).

---

## Constantes globales de color

Definidas localmente en cada archivo que las necesita (no hay archivo central de constantes):

```ts
const NAVY = '#252855'   // azul marino — color principal
const PINK = '#e7226d'   // rosa — color de acento / CTA
const BLUE = '#0049ff'   // azul eléctrico — usado en dashboard y POS
const GREEN = '#059669'  // verde — éxito / stock OK (solo en POS)
```

---

## Estructura de carpetas

```
C:\nube\
├── app\                          rutas del panel administrativo
│   ├── layout.tsx                root layout → AuthProvider + AppChrome
│   ├── login\page.tsx            /login  (ruta pública)
│   ├── dashboard\page.tsx        /dashboard
│   ├── productos\page.tsx        /productos
│   ├── ventas\page.tsx           /ventas
│   ├── clientes\page.tsx         /clientes
│   ├── punto-de-venta\page.tsx   /punto-de-venta
│   ├── proveedores\page.tsx      /proveedores  (ruta pública)
│   └── configuracion\page.tsx    /configuracion
├── components\
│   ├── Storefront.tsx            tienda pública completa
│   ├── AppChrome.tsx             shell del admin (Sidebar + Topbar + acceso por rol)
│   ├── Sidebar.tsx               navegación lateral fija
│   ├── Topbar.tsx                barra superior con búsqueda inline
│   └── GlobalSearch.tsx          modal de búsqueda global (Ctrl+K)
├── lib\
│   ├── supabase.ts               cliente Supabase (+ mock si faltan env vars)
│   ├── auth-context.tsx          AuthProvider, useAuth(), canAccess(), tipos Role/AuthUser
│   ├── validation.ts             isValidEmail()
│   └── uploadWebp.ts             convertToWebp(), captureFrameAsWebp(), uploadToSupabase()
├── public\storefront\            logo.svg, monograma.svg de la tienda
└── Doc\
    ├── memoria.md                instrucciones de registro de sesión
    ├── database\
    │   ├── schema.sql            esquema completo de la DB
    │   ├── auth.sql              políticas RLS y roles
    │   ├── seed.sql              datos de prueba
    │   └── migration_tablas_faltantes.sql  migración segura (IF NOT EXISTS)
    ├── documentacion\
    │   └── documento.md          portada de la documentación
    └── sesiones\
        └── seccion-DD-MM-YYYY.md archivo por día de trabajo
```

> El detalle de qué hace cada archivo de `app/`, `components/` y `lib/` está en [Módulos UI](./modulos-ui.md). El detalle de los `.sql` de `Doc/database/` está en [Datos](./datos.md).

---

## Rutas públicas (sin AppChrome)

```ts
// components/AppChrome.tsx
const PUBLIC_PATHS = ['/', '/login', '/proveedores']
```

Estas rutas renderizan sus `children` directamente sin Sidebar ni Topbar.

---

## Sistema de autenticación y roles

### Roles disponibles

```ts
// lib/auth-context.tsx
type Role = 'admin' | 'vendedor' | 'bodega'
```

### Acceso por rol

```ts
const ROLE_ROUTES: Record<Role, string[]> = {
  admin:    ['*'],   // todo
  vendedor: ['/dashboard', '/ventas', '/clientes'],
  bodega:   ['/productos', '/envio-nube'],
}

const ROLE_HOME: Record<Role, string> = {
  admin:    '/dashboard',
  vendedor: '/dashboard',
  bodega:   '/productos',
}
```

### Labels de rol (AppChrome + Sidebar)

```ts
const ROLE_LABELS = { admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodega' }
const ROLE_HOME_CHROME = { admin: '/dashboard', vendedor: '/dashboard', bodega: '/productos' }
```

### Flujo de login

1. `supabase.auth.signInWithPassword({ email, password })`
2. Consulta `user_roles` donde `user_id = session.user.id` → obtiene `role, nombre`
3. Redirige a `ROLE_HOME[role]` o al query param `?redirect=`
4. Si no tiene fila en `user_roles` → `signOut()` automático

> La tabla `user_roles` y sus políticas RLS se documentan en [Datos](./datos.md).
