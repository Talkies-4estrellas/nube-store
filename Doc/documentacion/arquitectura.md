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
const PUBLIC_PATHS = ['/', '/login', '/registro', '/proveedores', '/mi-cuenta']
```

`/tienda/[slug]` es pública por patrón de ruta dinámica (no está en la lista explícita).
Estas rutas renderizan sus `children` directamente sin Sidebar ni Topbar (excepto `/proveedores`
y `/mi-cuenta`, que tienen su propio layout con sidebar propio).

---

## Sistema de autenticación y roles

### Roles disponibles

```ts
// lib/auth-context.tsx
type Role = 'admin' | 'vendedor' | 'bodega' | 'proveedor' | 'basico'
```

`proveedor` y `basico` se agregaron el 23/07/2026 junto con el self-signup público en
`/registro` (el rol se sanitiza en el servidor vía trigger `handle_new_user` — nunca se puede
autoasignar `admin`/`vendedor`/`bodega` desde el cliente).

### Acceso por rol

```ts
const ROLE_ROUTES: Record<Role, string[]> = {
  admin:     ['/dashboard','/ventas','/productos','/clientes','/envio-nube','/tienda-en-linea','/punto-de-venta','/configuracion'],
  vendedor:  ['/dashboard','/ventas','/clientes'],
  bodega:    ['/productos','/envio-nube'],
  proveedor: ['/proveedores'],
  basico:    ['/mi-cuenta'],
}

const ROLE_HOME: Record<Role, string> = {
  admin: '/dashboard', vendedor: '/dashboard', bodega: '/productos',
  proveedor: '/proveedores', basico: '/mi-cuenta',
}
```

**`middleware.ts` reactivado el 27/07/2026** (llevaba tiempo deshabilitado) con esta misma tabla
duplicada localmente — un Edge Middleware no puede importar módulos `'use client'`, así que
`ROLE_ROUTES`/`ROLE_HOME` viven por separado ahí y en `lib/auth-context.tsx`, hay que mantener
ambas copias sincronizadas a mano. Comportamiento:
- Sin sesión en ruta protegida → redirige a `/login?redirect=<ruta>`
- Con sesión pero la ruta actual no está en `ROLE_ROUTES[role]` → redirige a `ROLE_HOME[role]`
- En `/login` con sesión activa → redirige a `ROLE_HOME[role]` solo si existe fila en `user_roles`
  (evita loop infinito para cuentas sin rol, que el cliente maneja con `signOut()`)

### Login social (Google / Facebook) — agregado 27/07/2026

`app/login/page.tsx` llama `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })`.
El callback es un Route Handler propio, `app/auth/callback/route.ts`, que hace
`exchangeCodeForSession(code)` y redirige a `/login` (donde el flujo normal de `ROLE_HOME` toma
el control). **Requisito no obvio:** la URL de `redirectTo` debe estar en la allowlist de
Supabase (Authentication → URL Configuration → Redirect URLs) — si falta, Supabase cae
silenciosamente al Site URL configurado, dejando el `code` sin consumir (síntoma visible:
`?code=...#_=_` colgado en la URL, el `_=_` es un artefacto propio de Facebook).

### Flujo de login (email/password)

1. `supabase.auth.signInWithPassword({ email, password })`
2. Consulta `user_roles` donde `user_id = session.user.id` → obtiene `role, nombre`
3. Redirige a `ROLE_HOME[role]` o al query param `?redirect=` (helper compartido `irSegunRol()`)
4. Si no tiene fila en `user_roles` → `signOut()` automático

> La tabla `user_roles` y sus políticas RLS se documentan en [Datos](./datos.md).

---

## 🕗 Sesiones relacionadas

Días de trabajo que tocaron esta área:

- [26/06/2026](../sesiones/seccion-26-06-2026.md) — andamiaje inicial (Create Next App).
- [27/06/2026](../sesiones/seccion-27-06-2026.md) — primeras páginas y navegación; ajustes Vercel.
- [28/06/2026](../sesiones/seccion-28-06-2026.md) — rebranding a Order Express, cliente Supabase.
- [29/06/2026](../sesiones/seccion-29-06-2026.md) — autenticación, roles, middleware y rutas públicas.
- [05/07/2026](../sesiones/seccion-05-07-2026.md) — consolidación definitiva del nombre Order Express.
- [23/07/2026](../sesiones/seccion-23-07-2026.md) — roles `proveedor`/`basico`, self-signup, `/mi-cuenta`.
- [27/07/2026](../sesiones/seccion-27-07-2026.md) — login Google/Facebook, `middleware.ts` reactivado con protección real por rol.
