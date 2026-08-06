-- ============================================================
--  Interruptor para mostrar/ocultar el cuadro "Selección curada para tu
--  setup." (kicker + título + subtítulo + badges) que aparece debajo del
--  header en la vista de Inicio del storefront.
-- ============================================================

alter table config_storefront add column if not exists inicio_resumen_activo boolean not null default true;
