-- Agrega columna detalles JSONB a la tabla productos
-- Ejecutar en Supabase SQL Editor
-- Guarda: colores, tallas, variantes, peso_g, dimensiones, imagenes_extra

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS detalles JSONB DEFAULT NULL;

-- Ejemplo de estructura almacenada:
-- {
--   "colores": ["Negro", "Blanco"],
--   "tallas": ["S", "M", "L"],
--   "variantes": [{"color":"Negro","talla":"S","stock":5}],
--   "peso_g": 250,
--   "dimensiones": {"largo":"30","ancho":"20","alto":"10"},
--   "imagenes_extra": ["https://...webp", "https://...webp"]
-- }
