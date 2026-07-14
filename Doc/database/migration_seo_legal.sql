-- Nuevas columnas para SEO y políticas legales
-- Ejecutar en Supabase SQL Editor

ALTER TABLE config_storefront
  ADD COLUMN IF NOT EXISTS meta_titulo       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_descripcion  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS og_imagen         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS politica_envio    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS politica_devolucion TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS terminos          TEXT DEFAULT '';
