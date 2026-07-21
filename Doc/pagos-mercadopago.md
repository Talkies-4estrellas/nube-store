# Pasarela de pagos — Mercado Pago (Checkout Pro)

## Arquitectura

```
Tienda (navegador)                  Servidor (Next.js)              Mercado Pago
─────────────────                   ──────────────────              ────────────
handleCheckout()
  crea cliente + venta ('Pendiente')
  + venta_items  ──────────────►
  POST /api/pagos/crear-preferencia
                                    lee venta_items de la BD
                                    (precios autoritativos)
                                    crea preferencia ─────────────►
                                    ◄───────────── init_point
  ◄──────────── { url }
  window.location = url ──────────────────────────────────────────► Checkout MP
                                                                    (usuario paga)
                                    ◄──── POST /api/pagos/webhook ── notificación
                                    consulta el pago real a MP ────►
                                    ◄──────────── status
                                    si 'approved':
                                      ventas.estado = 'Pagado'
                                      → dispara trg_descontar_stock
  ◄──────── redirect back_urls.success (?pago=exito&venta=N)
```

## Archivos

| Archivo | Función |
|---|---|
| `lib/supabase-server.ts` | Cliente Supabase con **service role key** (solo servidor, ignora RLS) |
| `app/api/pagos/crear-preferencia/route.ts` | Crea la preferencia de pago; recalcula importes desde la BD |
| `app/api/pagos/webhook/route.ts` | Recibe la notificación de MP y actualiza `ventas.estado` |
| `components/Storefront.tsx` | `handleCheckout` redirige al checkout; efecto que maneja el regreso |

## Variables de entorno

Agregar en `.env.local` (local) y en **Vercel → Settings → Environment Variables** (producción):

```bash
# Access Token de Mercado Pago (TEST para pruebas, APP_USR para producción)
MP_ACCESS_TOKEN=TEST-0000000000000000-000000-xxxxxxxxxxxxxxxxxxxxxxxx-000000000

# Service role key de Supabase (Settings → API → service_role)
# ⚠️ SECRETA: nunca exponerla al navegador ni subirla al repo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# URL pública del sitio (opcional; si falta se deduce del request)
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
```

### Por qué hace falta la service role key
La política RLS de `ventas` solo permite `UPDATE` a los roles `admin` y `vendedor`.
El webhook de Mercado Pago llega **sin sesión de usuario**, así que con la anon key
no podría marcar la venta como pagada. La service role key resuelve eso y por eso
vive únicamente en el servidor.

## Cómo obtener las credenciales de prueba

1. Entrar a <https://www.mercadopago.com.mx/developers/panel>
2. Crear una aplicación en **Tus integraciones**
3. Copiar el **Access Token de prueba** (empieza con `TEST-`)
4. En **Cuentas de prueba**, crear un usuario **vendedor** y uno **comprador**
5. Pagar con las [tarjetas de prueba](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/additional-content/test-cards)

## ⚠️ El webhook no funciona en localhost

Mercado Pago necesita una URL **pública** para notificar. En `localhost` nunca
llegará la notificación, así que la venta se quedará en `Pendiente` aunque el
pago se apruebe.

Opciones para probar el webhook:
- **Desplegar en Vercel** y probar ahí (lo más simple)
- Exponer el puerto local con un túnel (ngrok, cloudflared) y poner esa URL
  pública en `NEXT_PUBLIC_SITE_URL`

El resto del flujo (crear preferencia, redirigir, volver con `?pago=exito`)
sí funciona en localhost.

## Degradación elegante

Si `MP_ACCESS_TOKEN` no está configurado, el endpoint responde 500 y
`handleCheckout` cae al comportamiento anterior: el pedido queda registrado
como `Pendiente` y se muestra la pantalla de confirmación. La tienda sigue
funcionando sin pasarela.

## Seguridad aplicada

- Los precios **nunca** se toman del navegador: se releen de `venta_items`.
- El webhook **no confía** en el cuerpo de la notificación: vuelve a consultar
  el pago contra la API de MP con el `payment_id`.
- `external_reference` liga el pago con la venta.
- El `UPDATE` lleva `.neq('estado', 'Pagado')` para no reprocesar.
- El webhook responde 200 ante errores propios para evitar bucles de reintento.

## Pendiente / mejoras futuras

- [ ] Validar la firma `x-signature` del webhook (MP la envía en el header)
- [ ] Email de confirmación al aprobarse el pago
- [ ] Meses sin intereses (MSI) en la preferencia
- [ ] Guardar `payment_id` de MP en la tabla `ventas` para conciliación
