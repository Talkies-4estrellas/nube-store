-- ============================================================
--  Separar mensajes de "soporte técnico / empresa" de los mensajes de
--  admin que en realidad son sobre un producto puntual (los que llegan
--  desde la ficha pública cuando el producto no tiene proveedor real
--  vinculado y se ofrece "Contactar a soporte" en su lugar).
--
--  Hoy solo puede existir UN hilo cliente↔admin por cliente sin importar
--  el motivo — hay que permitir uno general (soporte/empresa) y, aparte,
--  uno por cada producto sobre el que pregunte.
-- ============================================================

drop index if exists idx_conv_admin_unico;

-- Un solo hilo "general" (soporte/técnico/empresa) por cliente — sin producto.
create unique index if not exists idx_conv_admin_unico_general
  on conversaciones (cliente_email)
  where tipo = 'cliente_admin' and producto_id is null;

-- Un hilo por cliente + producto para las preguntas de producto sin proveedor.
create unique index if not exists idx_conv_admin_unico_producto
  on conversaciones (cliente_email, producto_id)
  where tipo = 'cliente_admin' and producto_id is not null;
