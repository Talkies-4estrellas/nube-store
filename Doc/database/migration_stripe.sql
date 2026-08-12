-- ============================================================
--  Agrega Stripe como cuarta pasarela de pago (Payment Intents,
--  formulario de tarjeta propio con Stripe Elements — sin redirigir
--  al cliente fuera del sitio, a diferencia de Mercado Pago/PayPal).
--
--  Sigue el mismo patrón que las pasarelas existentes:
--  - config_metodos_pago: switch público de si el cliente la ve en el checkout
--  - config_pagos_secretos: credenciales, solo-admin (RLS ya la protege,
--    ver migration_seguridad_claves_pago.sql)
-- ============================================================

alter table config_metodos_pago
  add column if not exists stripe boolean not null default false;

alter table config_pagos_secretos
  add column if not exists stripe_secret_key      text,
  add column if not exists stripe_publishable_key text,
  add column if not exists stripe_webhook_secret   text,
  add column if not exists stripe_mode             text not null default 'sandbox';
