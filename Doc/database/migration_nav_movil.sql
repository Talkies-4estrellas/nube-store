-- ============================================================
--  Navegación móvil (barra inferior de la tienda) — editable
--  desde el panel: Tienda en línea > Navegación móvil
-- ============================================================

alter table config_storefront add column if not exists nav_movil jsonb default null;

-- Estructura esperada de nav_movil (todo opcional, con fallback en el código):
-- {
--   "inicio":  { "label": "Inicio",  "icon": "home" },
--   "buscar":  { "label": "Buscar",  "icon": "search" },
--   "rastreo": { "label": "Rastreo", "icon": "truck" },
--   "perfil":  { "label": "Perfil",  "icon": "user-circle" },
--   "extra": [ { "id": "...", "label": "WhatsApp", "icon": "message-circle", "url": "https://...", "nueva_pestana": true } ]
-- }
