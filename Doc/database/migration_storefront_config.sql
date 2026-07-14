-- Migración: nuevos campos configurables del storefront
-- Ejecutar en: Supabase → SQL Editor

ALTER TABLE config_storefront
  ADD COLUMN IF NOT EXISTS hero_tag1   TEXT    DEFAULT 'Entrega rápida',
  ADD COLUMN IF NOT EXISTS hero_tag2   TEXT    DEFAULT 'Stock limitado',
  ADD COLUMN IF NOT EXISTS hero_tag3   TEXT    DEFAULT 'Garantía incluida',
  ADD COLUMN IF NOT EXISTS nav_ocultar TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS topbar_btn1 TEXT    DEFAULT 'Nuevo',
  ADD COLUMN IF NOT EXISTS topbar_btn2 TEXT    DEFAULT 'Ofertas',
  ADD COLUMN IF NOT EXISTS carrusel    JSONB   DEFAULT '[
    {"img": "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1400&q=80", "kicker": "Setup destacado", "title": "Teclados compactos para crear y jugar."},
    {"img": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1400&q=80", "kicker": "Gaming portátil", "title": "Control total en cualquier lugar."},
    {"img": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1400&q=80", "kicker": "Audio premium", "title": "Sonido claro para concentrarte más."}
  ]'::jsonb;
