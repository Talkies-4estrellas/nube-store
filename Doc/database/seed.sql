-- ============================================================
--  ORDER EXPRESS — Datos de prueba
--  Ejecutar en Supabase SQL Editor
--  Incluye: productos, clientes, ventas y venta_items
-- ============================================================


-- ============================================================
--  CATEGORÍAS EXTRA (por si no existen)
-- ============================================================
insert into categorias (nombre) values
  ('Bolsos'), ('Cinturones'), ('Billeteras'), ('Estuches'),
  ('Relojes'), ('Keyboards'), ('Gaming'), ('Audio'), ('Smart'), ('Accesorios')
on conflict do nothing;


-- ============================================================
--  PRODUCTOS
-- ============================================================
insert into productos (nombre, sku, descripcion, precio, stock, categoria_id, imagen_url, activo)
values

-- Keyboards
('Teclado Mecánico TKL RGB',       'KB-001', 'Teclado compacto sin bloque numérico, switches Cherry MX Red, retroiluminación RGB por tecla y carcasa de aluminio anodizado.',                  1299, 18, (select id from categorias where nombre = 'Keyboards'), 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=700&q=80', true),
('Teclado Inalámbrico Slim Pro',   'KB-002', 'Diseño ultradelgado con conectividad Bluetooth 5.0 y USB-C. Autonomía de 3 meses con batería de 4000 mAh.',                                    890,  12, (select id from categorias where nombre = 'Keyboards'), 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=700&q=80', true),
('Teclado Numérico Portátil',      'KB-003', 'Numpad compacto con switches táctiles silenciosos, compatible con Windows y macOS. Ideal para trabajo contable.',                                349,  25, (select id from categorias where nombre = 'Keyboards'), 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?auto=format&fit=crop&w=700&q=80', true),

-- Gaming
('Gamepad Inalámbrico Pro',        'GM-001', 'Control de alta precisión con vibración háptica dual, disparadores analógicos y batería recargable de 20 horas de autonomía.',                  799,  9,  (select id from categorias where nombre = 'Gaming'), 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=700&q=80', true),
('Mouse Gaming 16000 DPI',         'GM-002', 'Mouse óptico con sensor de 16000 DPI, 7 botones programables, RGB personalizable y cable trenzado de 1.8 m.',                                  649,  14, (select id from categorias where nombre = 'Gaming'), 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=700&q=80', true),
('Headset Gaming 7.1 Surround',    'GM-003', 'Auriculares con sonido envolvente 7.1 virtual, micrófono retráctil con cancelación de ruido y almohadillas de espuma viscoelástica.',          950,  7,  (select id from categorias where nombre = 'Gaming'), 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=700&q=80', true),

-- Audio
('Audífonos Inalámbricos ANC',     'AU-001', 'Cancelación activa de ruido con hasta 30 horas de reproducción. Plegables, con estuche rígido incluido y conectividad multipoint.',            1599, 11, (select id from categorias where nombre = 'Audio'), 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=700&q=80', true),
('Bocina Bluetooth Portátil',      'AU-002', 'Resistente al agua IPX7, 360° de sonido estéreo, 24 horas de batería. Correa integrada para llevarla a cualquier lado.',                      599,  20, (select id from categorias where nombre = 'Audio'), 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=80', true),
('Earbuds TWS Pro',                'AU-003', 'Auriculares totalmente inalámbricos con 6 horas de batería + 18 horas adicionales con el estuche de carga. Driver de 10 mm.',                   449,  30, (select id from categorias where nombre = 'Audio'), 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=700&q=80', true),

-- Smart
('Smartwatch Fitness Pro',         'SW-001', 'Monitor de frecuencia cardíaca 24/7, GPS integrado, pantalla AMOLED 1.4", resistente al agua hasta 50 m y más de 100 modos deportivos.',      1850, 6,  (select id from categorias where nombre = 'Smart'), 'https://images.unsplash.com/photo-1523475496153-3e77f5be8461?auto=format&fit=crop&w=700&q=80', true),
('Monitor Portátil 15.6"',         'SW-002', 'Pantalla IPS Full HD con puertos USB-C y mini-HDMI, cubierta protectora magnética incluida. Ideal para home office y viajes.',                 2299, 4,  (select id from categorias where nombre = 'Smart'), 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&w=700&q=80', true),

-- Bolsos
('Bolso Tote Canvas Premium',      'BO-001', 'Lona de 600 g impermeabilizada, asas reforzadas con ribete de piel, bolsillo interior con cierre y base rígida antivuelco.',                   550,  16, (select id from categorias where nombre = 'Bolsos'), 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=80', true),
('Mochila Urbana 25L',             'BO-002', 'Mochila con compartimento acolchado para laptop de 15.6", puerto USB externo, múltiples bolsillos organizadores y tela repelente.',              750,  10, (select id from categorias where nombre = 'Bolsos'), 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80', true),

-- Billeteras
('Billetera RFID Slim',            'BW-001', 'Bloqueo RFID, capacidad para 8 tarjetas, bolsillo para billetes y diseño en piel vegana de alta durabilidad. Incluye caja de regalo.',         299,  22, (select id from categorias where nombre = 'Billeteras'), 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=700&q=80', true),

-- Relojes
('Reloj Análogo Minimalista',      'RJ-001', 'Caja de acero inoxidable 40 mm, cristal de zafiro, correa intercambiable de cuero genuino y movimiento japonés Miyota.',                       1100, 5,  (select id from categorias where nombre = 'Relojes'), 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80', true),

-- Accesorios
('Hub USB-C 7 en 1',               'AC-001', 'Concentrador con HDMI 4K, 3× USB-A 3.0, USB-C PD 100W, lector SD/microSD. Carcasa de aluminio que disipa el calor eficientemente.',           499,  35, (select id from categorias where nombre = 'Accesorios'), 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=700&q=80', true),
('Cargador Inalámbrico 15W',       'AC-002', 'Pad de carga Qi con 15W para dispositivos compatibles, 10W universal y LED indicador de carga. Base de silicona antideslizante.',              249,  40, (select id from categorias where nombre = 'Accesorios'), 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=700&q=80', true),
('Soporte Ergonómico Laptop',      'AC-003', 'Aluminio aeroespacial, ángulo ajustable en 6 posiciones, plegable en 2 segundos. Compatible con laptops de 11" a 17".',                        379,  28, (select id from categorias where nombre = 'Accesorios'), 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=700&q=80', true),

-- Estuches
('Estuche Laptop 15" Neopreno',    'ES-001', 'Neopreno de 5 mm con interior de microfibra, cierre YKK resistente al agua y asa de transporte reforzada.',                                    199,  33, (select id from categorias where nombre = 'Estuches'), 'https://images.unsplash.com/photo-1553456558-aff63285bdd1?auto=format&fit=crop&w=700&q=80', true),

-- Cinturones
('Cinturón Piel Genuina 35 mm',    'CI-001', 'Hebilla de acero inoxidable cepillado, piel de primera de 3.5 mm de grosor, perforado a mano y costura de lino resistente.',                   320,  15, (select id from categorias where nombre = 'Cinturones'), 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=700&q=80', true)

on conflict (sku) do nothing;


-- ============================================================
--  CLIENTES
-- ============================================================
insert into clientes (nombre, email, telefono, ciudad, tag) values
  ('Ana García',        'ana.garcia@email.com',      '555-1234', 'Ciudad de México', 'VIP'),
  ('Carlos Mendoza',    'carlos.m@email.com',         '555-2345', 'Monterrey',         'VIP'),
  ('Sofía Ramírez',     'sofia.r@email.com',          '555-3456', 'Guadalajara',       'Regular'),
  ('Diego Torres',      'diego.t@email.com',          '555-4567', 'Puebla',            'Regular'),
  ('Valentina López',   'valen.lopez@email.com',      '555-5678', 'Querétaro',         'Regular'),
  ('Miguel Hernández',  'miguel.h@email.com',         '555-6789', 'CDMX',              'Nuevo'),
  ('Lucía Flores',      'lucia.f@email.com',          '555-7890', 'León',              'Nuevo'),
  ('Roberto Sánchez',   'roberto.s@email.com',        '555-8901', 'Tijuana',           'Nuevo'),
  ('Camila Vega',       'camila.v@email.com',         '555-9012', 'Mérida',            'VIP'),
  ('Público en general','pos@orderexpress.local',     null,        null,               'Nuevo')
on conflict (email) do nothing;


-- ============================================================
--  VENTAS + ITEMS
--  (usamos CTEs para referenciar los IDs recién insertados)
-- ============================================================

-- Venta 1 — Ana García, Pagado
with v as (
  insert into ventas (cliente_id, estado, total, notas)
  values ((select id from clientes where email = 'ana.garcia@email.com'), 'Pagado', 2798, 'Pedido web')
  returning id
)
insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
select v.id, p.id, p.nombre, p.precio, 2
from v, productos p where p.sku = 'KB-001'
union all
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'AU-003';

-- Venta 2 — Carlos Mendoza, Pagado
with v as (
  insert into ventas (cliente_id, estado, total, notas)
  values ((select id from clientes where email = 'carlos.m@email.com'), 'Pagado', 3448, 'Pedido web')
  returning id
)
insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'AU-001'
union all
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'GM-001'
union all
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'AC-001';

-- Venta 3 — Sofía Ramírez, Pagado
with v as (
  insert into ventas (cliente_id, estado, total, notas)
  values ((select id from clientes where email = 'sofia.r@email.com'), 'Pagado', 1449, 'POS · Efectivo')
  returning id
)
insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'SW-001';

-- Venta 4 — Camila Vega, Pagado
with v as (
  insert into ventas (cliente_id, estado, total, notas)
  values ((select id from clientes where email = 'camila.v@email.com'), 'Pagado', 4248, 'Pedido web')
  returning id
)
insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'SW-002'
union all
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'KB-001'
union all
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'AC-002';

-- Venta 5 — Diego Torres, Pagado
with v as (
  insert into ventas (cliente_id, estado, total, notas)
  values ((select id from clientes where email = 'diego.t@email.com'), 'Pagado', 1647, 'POS · Tarjeta')
  returning id
)
insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'GM-002'
union all
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'GM-003';

-- Venta 6 — Valentina López, Enviado
with v as (
  insert into ventas (cliente_id, estado, total, notas)
  values ((select id from clientes where email = 'valen.lopez@email.com'), 'Enviado', 1550, 'Pedido web')
  returning id
)
insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'BO-001'
union all
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'BO-002';

-- Venta 7 — Miguel Hernández, Pendiente
with v as (
  insert into ventas (cliente_id, estado, total, notas)
  values ((select id from clientes where email = 'miguel.h@email.com'), 'Pendiente', 699, 'Pedido web')
  returning id
)
insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'AU-002';

-- Venta 8 — Público en general, Pagado (venta POS)
with v as (
  insert into ventas (cliente_id, estado, total, notas)
  values ((select id from clientes where email = 'pos@orderexpress.local'), 'Pagado', 1098, 'POS · Efectivo')
  returning id
)
insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
select v.id, p.id, p.nombre, p.precio, 2
from v, productos p where p.sku = 'AC-001'
union all
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'AC-002';

-- Venta 9 — Lucía Flores, Pagado
with v as (
  insert into ventas (cliente_id, estado, total, notas)
  values ((select id from clientes where email = 'lucia.f@email.com'), 'Pagado', 619, 'Pedido web')
  returning id
)
insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'BW-001'
union all
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'CI-001';

-- Venta 10 — Carlos Mendoza (segunda compra), Pagado
with v as (
  insert into ventas (cliente_id, estado, total, notas)
  values ((select id from clientes where email = 'carlos.m@email.com'), 'Pagado', 2599, 'Pedido web')
  returning id
)
insert into venta_items (venta_id, producto_id, nombre, precio, cantidad)
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'SW-001'
union all
select v.id, p.id, p.nombre, p.precio, 1
from v, productos p where p.sku = 'AC-003';


-- ============================================================
--  ACTUALIZAR STOCK — descontar lo que ya se vendió
--  (solo ventas Pagadas; el trigger aplica en UPDATE, no INSERT)
-- ============================================================
update productos set stock = stock - 2 where sku = 'KB-001';
update productos set stock = stock - 1 where sku = 'AU-003';
update productos set stock = stock - 1 where sku = 'AU-001';
update productos set stock = stock - 1 where sku = 'GM-001';
update productos set stock = stock - 2 where sku = 'AC-001';
update productos set stock = stock - 1 where sku = 'SW-001'; -- dos ventas
update productos set stock = stock - 1 where sku = 'SW-002';
update productos set stock = stock - 1 where sku = 'GM-002';
update productos set stock = stock - 1 where sku = 'GM-003';
update productos set stock = stock - 1 where sku = 'BW-001';
update productos set stock = stock - 1 where sku = 'CI-001';
update productos set stock = stock - 1 where sku = 'AC-002'; -- dos ventas
update productos set stock = stock - 1 where sku = 'AC-003';
update productos set stock = stock - 1 where sku = 'SW-001'; -- segunda venta Carlos


-- ============================================================
--  ACTUALIZAR TAGS de clientes según pedidos pagados
-- ============================================================
update clientes set tag = 'VIP'     where email in ('ana.garcia@email.com', 'carlos.m@email.com', 'camila.v@email.com');
update clientes set tag = 'Regular' where email in ('sofia.r@email.com', 'diego.t@email.com', 'lucia.f@email.com');
update clientes set tag = 'Nuevo'   where email in ('miguel.h@email.com', 'roberto.s@email.com');
