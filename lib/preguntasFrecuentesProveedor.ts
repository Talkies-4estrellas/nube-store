import type { Pregunta } from './preguntasFrecuentes'

export const PREGUNTAS_PROVEEDOR: Pregunta[] = [
  {
    categoria: 'Tablero',
    pregunta: '¿Qué significan "Por pagar" y "Ya pagado" en mi Tablero?',
    explicacion: 'Son montos calculados automáticamente sobre el costo registrado de cada producto multiplicado por la cantidad vendida — es un cálculo informativo dentro del panel, para que tengas una idea de cuánto llevas vendido. El pago real de ese dinero NO se transfiere solo desde aquí: se coordina directamente con el equipo de Order Express (por fuera del panel).',
    confusion: 'Se puede pensar que "Ya pagado" significa que el dinero ya llegó a tu cuenta automáticamente, o que "Por pagar" es una solicitud de pago que ya está en proceso — ninguna de las dos cosas es cierta, son solo números de referencia.',
    porQuePasa: 'El panel puede calcular estos montos porque ya tiene el precio y las ventas registradas, pero conectar eso a un pago automático real (transferencia bancaria, etc.) es una integración que no existe todavía — así que se dejó como información de referencia, con el aviso de texto chico debajo de los números.',
    solucion: 'Usa estos números para llevar tu propia cuenta de cuánto se te debe, pero para recibir el pago real, contacta directamente al equipo de Order Express — no esperes a que el número de "Por pagar" se mueva solo a "Ya pagado" como señal de que cobraste.',
    tutorial: [
      'Ve a Tablero (la pantalla principal del portal).',
      'Los recuadros "Por pagar" y "Ya pagado" están debajo de las métricas de productos.',
      'Lee el texto pequeño debajo: "Es informativo — el pago real se coordina con el equipo de Order Express."',
      'Para cobrar de verdad, comunícate directamente con Order Express, no esperes una acción automática del panel.',
    ],
  },
  {
    categoria: 'Productos',
    pregunta: '¿Cuál es la diferencia entre "Mis solicitudes" y "Mis productos"?',
    explicacion: '"Mis solicitudes" muestra los productos que registraste y que todavía están esperando revisión del admin (pendientes, aprobados o rechazados, con el motivo si te rechazaron alguno). "Mis productos" muestra solo los que YA fueron aprobados y están publicados de verdad en la tienda.',
    confusion: 'Se registra un producto nuevo y se busca en "Mis productos" esperando verlo ahí de inmediato — pero mientras no lo apruebe el admin, solo aparece en "Mis solicitudes", no en "Mis productos".',
    porQuePasa: 'Un producto nuevo nunca se publica solo — siempre pasa primero por la revisión de un administrador (para evitar errores o contenido indebido). "Mis solicitudes" es la sala de espera de ese proceso; "Mis productos" es el catálogo ya en vivo.',
    solucion: 'Después de registrar un producto, revisa el estado en "Mis solicitudes" (verás si sigue en revisión, si se aprobó, o si se rechazó con el motivo). Solo cuando se aprueba pasa a aparecer también en "Mis productos".',
    tutorial: [
      '"Registrar producto": para dar de alta uno nuevo.',
      '"Mis solicitudes": para ver el estado de aprobación de lo que registraste (con opción de reenviar a revisión si te lo rechazaron).',
      '"Mis productos": el catálogo de lo que ya está aprobado y visible en la tienda.',
    ],
  },
  {
    categoria: 'Transferencias',
    pregunta: '¿Qué pasa cuando acepto una Transferencia?',
    explicacion: 'Una "Transferencia" es cuando el administrador te asigna un producto que antes era suyo (o de otro proveedor) para que pase a ser tuyo. Al aceptarla, ese producto se vuelve tuyo de inmediato en el sistema, con el mismo precio/stock que ya tenía — no puedes deshacerlo después por tu cuenta.',
    confusion: 'Se puede pensar que aceptar es solo "enterarte" de la transferencia, sin consecuencias reales, cuando en realidad el producto cambia de dueño de forma permanente al aceptar.',
    porQuePasa: 'El sistema de transferencias existe para mover productos entre proveedores (o del admin a un proveedor) sin perder su historial de ventas ni recrearlos desde cero — por diseño, aceptar es una decisión definitiva, similar a "recibir" algo que ya no se puede devolver solo con un clic.',
    solucion: 'Antes de aceptar una transferencia, revisa bien qué producto es y confirma que sí quieres que sea tuyo — si tienes dudas, contacta al admin antes de aceptar, no después.',
    tutorial: [
      'Ve a Transferencias en el menú lateral (el número junto al ítem indica cuántas tienes pendientes).',
      'Revisa el producto que te quieren transferir.',
      'Acepta solo si estás seguro — el producto pasa a ser tuyo de inmediato, con su precio y stock actuales.',
    ],
  },
  {
    categoria: 'Ajustes',
    pregunta: '¿Qué pasa si pauso mi cuenta?',
    explicacion: 'Al pausar tu cuenta, TODOS tus productos se ocultan de la tienda pública al mismo tiempo (dejan de ser visibles para los clientes), pero no se borran ni pierdes tu información — puedes reactivar tu cuenta cuando quieras y tus productos vuelven a mostrarse.',
    confusion: 'Se puede pensar que pausar la cuenta es algo menor (como cerrar sesión) o que solo oculta el perfil, sin darse cuenta de que oculta absolutamente TODOS los productos de golpe, incluso los que se estaban vendiendo bien.',
    porQuePasa: 'Está pensado para proveedores que necesitan detener sus ventas temporalmente (vacaciones, falta de inventario, etc.) sin tener que desactivar producto por producto — por eso el efecto es total e inmediato sobre todo el catálogo, no parcial.',
    solucion: 'Úsalo solo cuando de verdad quieras dejar de vender temporalmente en TODOS tus productos a la vez. Si solo quieres ocultar uno o dos productos puntuales, no pauses la cuenta — edita esos productos individualmente en su lugar.',
    tutorial: [
      'Ve a Ajustes en el menú lateral.',
      'Botón "⏸️ Pausar mi cuenta" — confirma que entiendes que oculta todos tus productos a la vez.',
      'Para volver a vender, regresa a Ajustes y reactiva tu cuenta — tus productos reaparecen tal como estaban.',
    ],
  },
  {
    categoria: 'Tablero',
    pregunta: '¿A dónde me llevan las notificaciones de la campana (🔔)?',
    explicacion: 'La campana arriba a la derecha agrupa avisos de distintos tipos: productos en revisión, productos rechazados, y transferencias pendientes. Cada uno te lleva a la pantalla correspondiente (Mis solicitudes o Transferencias) al hacerle clic.',
    confusion: 'No siempre es obvio que cada aviso de la campana es clicable y te navega a otro lado — se puede pensar que es solo un resumen para leer ahí mismo.',
    porQuePasa: 'La campana se diseñó como un acceso rápido a lo que necesita tu atención, para no tener que revisar cada pestaña del menú una por una buscando qué cambió.',
    solucion: 'Revisa la campana como primer paso al entrar al portal — te ahorra tener que ir pestaña por pestaña buscando qué es nuevo.',
    tutorial: [
      'Clic en el ícono 🔔 arriba a la derecha.',
      'Cada línea muestra cuántos productos en revisión, rechazados, o transferencias pendientes tienes.',
      'Clic en cualquiera de ellas te lleva directo a la pantalla correspondiente.',
    ],
  },
]
