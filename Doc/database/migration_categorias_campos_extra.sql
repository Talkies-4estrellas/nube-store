-- Fase 2 de "campos contextuales por categoría": permite configurar desde
-- Tienda en línea > Filtros, sin tocar código, qué apartados opcionales
-- (tallas, género, material, etc.) aparecen en el formulario de productos
-- según la categoría padre elegida.

alter table categorias add column if not exists campos_extra jsonb;

-- Semilla: reproduce en la base de datos la configuración de "Ropa" que
-- antes vivía fija en el código (fase 1), para no perder el comportamiento
-- ya probado al pasar a fase 2.
update categorias
set campos_extra = '{
  "icon": "🧵",
  "titulo": "Detalles de ropa",
  "hint": "Tallas, género, material y más — todo opcional",
  "tallas": ["XS", "S", "M", "L", "XL", "XXL", "Único"],
  "grupos": [
    { "label": "Género", "opciones": ["Hombre", "Mujer", "Unisex", "Niño", "Niña"] },
    { "label": "Material / Tela", "opciones": ["Algodón", "Poliéster", "Mezclilla", "Lino", "Lana", "Seda", "Spandex"], "permitirOtro": true },
    { "label": "Temporada", "opciones": ["Primavera/Verano", "Otoño/Invierno", "Todo el año"] },
    { "label": "Tipo de manga / corte", "opciones": ["Manga corta", "Manga larga", "Sin mangas", "Entallado", "Holgado"] }
  ]
}'::jsonb
where lower(trim(nombre)) = 'ropa' and parent_id is null and campos_extra is null;
