# Activar "Iniciar sesión con Google / Facebook" — paso a paso

El código de la app ya está listo (botones en `/login`, ruta de retorno en
`app/auth/callback/route.ts`). Lo que falta cada vez que se conecta un
proyecto de Supabase NUEVO es la **configuración externa**: crear las
credenciales en Google y Facebook, y pegarlas en Supabase.

Tiempo estimado: 30-45 minutos (Google es más rápido, Facebook tarda más
por la revisión de la app).

**Dato clave que se usa varias veces en esta guía — tu "Callback URL de Supabase":**
```
https://vzpewbaipftsocbauehe.supabase.co/auth/v1/callback
```
Este es el link que Google y Facebook necesitan conocer — **no** es la URL
de tu sitio, es la de Supabase. Cópialo, lo vas a pegar dos veces (una en
Google, una en Facebook).

---

## PARTE 1 — Google

### Paso 1. Crear el proyecto en Google Cloud

1. Entra a **https://console.cloud.google.com/**
2. Arriba, junto al logo de Google Cloud, hay un selector de proyecto → **Nuevo proyecto**
3. Nómbralo (ej. "Order Express") → **Crear**
4. Espera a que se cree (unos segundos) y selecciónalo desde el mismo menú

### Paso 2. Configurar la "Pantalla de consentimiento OAuth"

Google exige esto antes de dejarte crear credenciales — es la pantalla que
ve el usuario cuando le pide permiso para usar su cuenta de Google.

1. Menú ☰ (arriba a la izquierda) → **APIs y servicios** → **Pantalla de consentimiento de OAuth**
2. Tipo de usuario: **Externo** → **Crear**
3. Llena lo obligatorio:
   - Nombre de la app: "Order Express"
   - Correo de asistencia al usuario: tu correo
   - Logo (opcional, pero se ve más profesional)
   - Dominio de la app / Política de privacidad / Términos: puedes dejarlos
     vacíos para pruebas, pero **para producción real Google los pide**
   - Correo de contacto del desarrollador: tu correo
4. **Guardar y continuar** en cada pantalla (Alcances y Usuarios de prueba
   los puedes dejar como están) hasta terminar

> Mientras la app esté en modo "Prueba" (Testing), solo pueden iniciar
> sesión los correos que agregues manualmente en "Usuarios de prueba". Para
> que cualquiera pueda usarlo, hay que **Publicar la app** (mismo menú,
> botón "Publicar aplicación") — Google puede pedir una revisión si usas
> alcances sensibles, pero el login básico (nombre, correo, foto) normalmente
> no la requiere.

### Paso 3. Crear las credenciales (Client ID / Secret)

1. Menú ☰ → **APIs y servicios** → **Credenciales**
2. **+ Crear credenciales** → **ID de cliente de OAuth**
3. Tipo de aplicación: **Aplicación web**
4. Nombre: "Order Express Web"
5. **Orígenes autorizados de JavaScript** → **+ Agregar URI**:
   ```
   http://localhost:3000
   https://nube-store-pi.vercel.app
   ```
6. **URI de redireccionamiento autorizados** → **+ Agregar URI** → pega tu
   **Callback URL de Supabase** (la de arriba):
   ```
   https://vzpewbaipftsocbauehe.supabase.co/auth/v1/callback
   ```
7. **Crear**

Te va a mostrar un cuadro con **Client ID** y **Client secret** — cópialos,
los necesitas en el Paso 5. Si cierras el cuadro sin copiarlos, los vuelves
a ver entrando a Credenciales → clic en el nombre de la credencial.

---

## PARTE 2 — Facebook

### Paso 4. Crear la app en Meta for Developers

1. Entra a **https://developers.facebook.com/apps/**
2. **Crear app**
3. Caso de uso: elige **"Autenticar y solicitar datos de los usuarios con
   Facebook Login"** (o "Consumidor" en versiones más viejas del asistente)
4. Nombre de la app: "Order Express" → **Crear app**

### Paso 5. Configurar Facebook Login

1. En el panel de la app, busca el producto **Facebook Login** en la lista
   (si no aparece, **+ Agregar producto** → busca "Facebook Login" → **Configurar**)
2. Ve a **Facebook Login → Configuración**
3. En **URI de redirección de OAuth válidos**, pega la misma **Callback URL
   de Supabase**:
   ```
   https://vzpewbaipftsocbauehe.supabase.co/auth/v1/callback
   ```
4. **Guardar cambios**

### Paso 6. Sacar el App ID y App Secret

1. Menú lateral → **Configuración → Básica**
2. Copia **ID de la aplicación** (App ID) y **Clave secreta** (App Secret —
   quizá te pida tu contraseña de Facebook para revelarla)

> Mientras la app esté en **modo Desarrollo** (arriba, junto al nombre de la
> app hay un switch Desarrollo/Activo), solo pueden iniciar sesión los
> correos que agregues como "Roles → Testers" o administradores de la app.
> Para producción real, hay que pasarla a **Activo** — Meta puede pedir
> verificación de la empresa y revisión de la app según qué datos pidas
> (el login básico usualmente no la requiere, pero **si tarda**, cuenta con
> que puede llevar de días a semanas).

---

## PARTE 3 — Conectar todo en Supabase

### Paso 7. Activar el proveedor Google

1. Entra al proyecto en **https://supabase.com/dashboard**
2. **Authentication** (ícono de personas, barra izquierda) → **Providers**
3. Busca **Google** en la lista → actívalo (switch)
4. Pega el **Client ID** y **Client Secret** que copiaste en el Paso 3
5. **Save**

### Paso 8. Activar el proveedor Facebook

1. Mismo lugar, busca **Facebook** → actívalo
2. Pega el **App ID** y **App Secret** del Paso 6
3. **Save**

### Paso 9. Registrar las Redirect URLs de tu propio sitio

Esta parte es la que más se olvida y la que causa el bug típico ("se queda
pegado en una URL rara con `?code=...` y no entra"):

1. **Authentication → URL Configuration**
2. **Site URL**: la URL de producción, ej. `https://nube-store-pi.vercel.app`
3. **Redirect URLs** → agrega (una por línea, o con el botón **+ Add URL**):
   ```
   http://localhost:3000/auth/callback
   https://nube-store-pi.vercel.app/auth/callback
   ```
   Si pruebas en otro puerto local (3001, etc.) o tienes un dominio de
   preview de Vercel distinto, agrega también esas variantes.
4. **Save**

> Estas son las URLs a las que Supabase te manda DE VUELTA después de que
> ya inició tu sesión con Google/Facebook — son distintas de la "Callback
> URL de Supabase" de la Parte 1/2, que es a donde Google/Facebook mandan
> el resultado ANTES, para que Supabase lo procese. Son dos saltos
> distintos: Google/Facebook → Supabase → tu app.

---

## Probarlo

1. `npm run dev` (o abre el sitio en producción)
2. Ve a `/login`
3. Clic en **Continuar con Google** (o Facebook)
4. Debe abrir la pantalla de permiso de Google/Facebook, y al aceptar,
   regresar ya con la sesión iniciada a tu panel correspondiente según el rol

### Checklist final

- [ ] Pantalla de consentimiento de Google configurada (o app publicada)
- [ ] Client ID / Secret de Google pegados en Supabase → Providers → Google
- [ ] App de Facebook Login configurada con la Callback URL de Supabase
- [ ] App ID / Secret de Facebook pegados en Supabase → Providers → Facebook
- [ ] Site URL + Redirect URLs (local y producción) guardadas en Supabase
- [ ] Probado con una cuenta real: entra y aterriza en el panel correcto

---

## Si algo sale mal

| Síntoma | Causa probable |
|---|---|
| Botón no hace nada / error inmediato | Provider no está **activado** (switch) en Supabase → Providers |
| Pantalla de Google dice "No cumple con la política" o "app no verificada" | Falta completar la Pantalla de consentimiento, o la app sigue en modo Prueba y ese correo no está en la lista de testers |
| Redirige pero cae con `?code=...#_=_` sin iniciar sesión | La Redirect URL (`/auth/callback`) no está en la lista blanca de **Redirect URLs** de Supabase (Paso 9) |
| Facebook dice "URL bloqueada" | La Callback URL de Supabase no está pegada (o está mal pegada) en Facebook Login → Configuración (Paso 5) |
| Entra pero aterriza en el panel equivocado según su rol | No es un problema de OAuth — revisar `middleware.ts` / `ROLE_ROUTES` en `lib/auth-context.tsx` |
| Funciona en local pero no en producción (o al revés) | Falta agregar esa URL específica (localhost vs. dominio de Vercel) en Orígenes/Redirects de Google, Facebook Login, y Redirect URLs de Supabase — hay que registrar **las dos**, no solo una |

**Este proceso se repite completo cada vez que se conecta un proyecto de
Supabase nuevo** (ej. después de una migración de cuenta, ver
`Doc/migracion-supabase.md`) — las credenciales de Google/Facebook se
pueden reutilizar (mismo Client ID/App ID), pero hay que volver a pegarlas
en el proyecto nuevo de Supabase y volver a registrar sus Redirect URLs.
