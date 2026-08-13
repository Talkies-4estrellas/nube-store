'use client'

import { useState } from 'react'

const NAVY = '#252855'
const BLUE = '#0049ff'

type Pregunta = {
  categoria: string
  pregunta: string
  explicacion: string
  confusion: string
  tutorial: string[]
}

const PREGUNTAS: Pregunta[] = [
  {
    categoria: 'Gestión',
    pregunta: '¿Dónde encuentro los productos de mis proveedores?',
    explicacion: 'Todos los productos —los tuyos y los de tus proveedores— viven juntos en la misma pantalla de Productos. Un producto de proveedor se distingue por la etiqueta "📦" con el nombre del proveedor debajo del SKU.',
    confusion: 'Se busca una sección aparte solo para "productos de proveedores" y no existe — todos están mezclados en el mismo catálogo, filtrables por proveedor.',
    tutorial: [
      'Clic en Productos en el menú lateral.',
      'Usa el filtro "📦 Proveedores" arriba de la tabla para ver solo los de un proveedor específico.',
      'La etiqueta "📦 Nombre del proveedor" debajo del SKU te dice de quién es cada producto.',
    ],
  },
  {
    categoria: 'Gestión',
    pregunta: '¿Dónde veo las solicitudes de productos nuevos que mandan los proveedores?',
    explicacion: 'Cuando un proveedor registra un producto nuevo, no aparece automáticamente en el catálogo — queda en una lista de solicitudes pendientes de tu aprobación, escondida detrás de un botón dentro de Productos.',
    confusion: 'El botón "Solicitudes" no es muy visible y no se abre solo — hay que saber que existe y darle clic para ver si hay algo pendiente. También puedes verlo desde el Dashboard: la tarjeta "Pendientes de aprobación" te lleva directo ahí con el panel ya abierto.',
    tutorial: [
      'Clic en Productos en el menú lateral.',
      'Arriba a la derecha, clic en el botón "Solicitudes" (muestra un número si hay pendientes).',
      'Revisa cada solicitud y dale "Aprobar y publicar" o "Rechazar".',
      'Atajo: desde el Dashboard, la tarjeta "Pendientes de aprobación" te lleva aquí directo.',
    ],
  },
  {
    categoria: 'Gestión',
    pregunta: '¿Dónde administro a mis proveedores?',
    explicacion: 'Los proveedores no tienen su propio botón en el menú — viven dentro de Clientes, en una pestaña aparte arriba de la tabla.',
    confusion: 'Se busca un ítem "Proveedores" en el menú lateral y no existe como tal, porque comparte pantalla con Clientes.',
    tutorial: [
      'Clic en Clientes en el menú lateral.',
      'Arriba de la tabla, clic en la pestaña "📦 Proveedores".',
      'Ahí puedes ver, suspender o reactivar cada proveedor.',
      'Si esperas gente que quiere registrarse como proveedor nuevo, el botón "🆕 Nuevos proveedores" está en esa misma pantalla, arriba a la izquierda.',
    ],
  },
  {
    categoria: 'Gestión',
    pregunta: '¿Cuál es la diferencia entre "Mensajes" y "Comentarios"?',
    explicacion: '"Mensajes" (en el menú principal) son consultas de clientes sobre un producto específico. "Comentarios" (dentro de Configuración) es soporte general que no está relacionado a ningún producto en particular.',
    confusion: 'Suenan casi igual y un cliente puede escribir por cualquiera de los dos caminos, así que un mensaje puede estar en cualquiera de los dos lugares según de qué haya hablado el cliente.',
    tutorial: [
      'Si el cliente preguntó sobre un producto: revísalo en Mensajes, en el menú lateral.',
      'Si el cliente escribió soporte general (no sobre un producto): está en Configuración → Comentarios.',
      'Ambos se comportan igual (puedes responder desde ahí), solo cambia dónde se guardan según el tema.',
    ],
  },
  {
    categoria: 'Gestión',
    pregunta: '¿Dónde veo las solicitudes de gente que quiere registrarse como proveedor?',
    explicacion: 'Es distinto de las solicitudes de productos — estas son de personas nuevas que quieren empezar a vender en tu tienda, y también viven dentro de Clientes → Proveedores.',
    confusion: 'Se confunde fácilmente con las solicitudes de productos nuevos (que están en Productos) — son dos listas de "pendientes" completamente separadas.',
    tutorial: [
      'Clic en Clientes en el menú lateral.',
      'Pestaña "📦 Proveedores".',
      'Botón "🆕 Nuevos proveedores" arriba a la izquierda (muestra un número si hay solicitudes).',
      'Aprobar crea la cuenta del proveedor automáticamente y le manda su acceso por correo.',
    ],
  },
  {
    categoria: 'Ventas',
    pregunta: '¿Qué significa cada estado de un pedido?',
    explicacion: 'Un pedido pasa por: Pendiente (recién creado, sin cobro confirmado) → En proceso → Pagado (el cobro ya se confirmó, aquí se descuenta el stock) → Enviado. También puede quedar Cancelado.',
    confusion: 'Se piensa que "Pendiente" significa que algo salió mal, cuando en realidad es el estado normal de arranque de cualquier pedido nuevo hasta que se confirma el pago.',
    tutorial: [
      'Clic en Ventas en el menú lateral.',
      'El color de cada pedido en la tabla indica su estado (amarillo=Pendiente, verde=Pagado, etc.).',
      'Puedes cambiar el estado manualmente entrando al detalle del pedido, si el pago se coordinó fuera del sistema (efectivo/transferencia).',
    ],
  },
  {
    categoria: 'Ventas',
    pregunta: '¿Por qué un pedido no cambia de estado solo?',
    explicacion: 'Solo pasa a "Pagado" automáticamente si el cliente pagó con una pasarela electrónica (Mercado Pago, PayPal, BBVA o Stripe) y esa pasarela confirmó el cobro. Si el cliente eligió Efectivo o Transferencia, el cambio de estado es manual — tú lo marcas cuando confirmes que llegó el dinero.',
    confusion: 'Se espera que todos los pedidos se actualicen solos, sin saber que "Efectivo" y "Transferencia" siempre requieren que un admin lo marque a mano.',
    tutorial: [
      'Clic en Ventas → abre el pedido en cuestión.',
      'Si el método fue Efectivo/Transferencia y ya confirmaste el pago, cambia el estado manualmente ahí mismo.',
      'Si fue con una pasarela electrónica y no cambió, revisa que esa pasarela tenga sus llaves configuradas en Configuración → Métodos de pago.',
    ],
  },
  {
    categoria: 'Tienda en línea',
    pregunta: '¿Dónde cambio lo que se ve en la página de Inicio de la tienda?',
    explicacion: 'Todo lo del Home (colores, logo, textos, fotos del carrusel, productos destacados) se edita desde Tienda en línea → Diseño, con una vista previa en vivo al lado.',
    confusion: 'Con 9 sub-secciones dentro de "Tienda en línea", cuesta adivinar cuál controla qué — "Diseño" es la más general y suele ser la que se busca primero.',
    tutorial: [
      'Clic en Tienda en línea en el menú lateral (te lleva directo a "Diseño").',
      'Usa la vista previa de la derecha para ver los cambios en tiempo real.',
      'Para las fotos del carrusel específicamente, ve a la sub-sección "Carrusel".',
    ],
  },
  {
    categoria: 'Tienda en línea',
    pregunta: '¿Qué es "Carrusel" y para qué sirve?',
    explicacion: 'Es donde subes las fotos grandes que rotan en la parte de arriba del Home de la tienda (con su texto encima).',
    confusion: 'Antes era la sección de "Blog" y se renombró a "Carrusel" — si ves referencias viejas a "blog" en el proyecto, es la misma sección.',
    tutorial: [
      'Tienda en línea → sub-sección "Carrusel".',
      'Sube la foto, escribe el texto pequeño (kicker) y el título grande.',
      'El orden en que las agregues es el orden en que rotan en la tienda.',
    ],
  },
  {
    categoria: 'Pagos',
    pregunta: '¿Por qué un cliente dice que pagó y el pedido sigue "Pendiente"?',
    explicacion: 'Si el cliente eligió una pasarela electrónica (Mercado Pago, PayPal, BBVA o Stripe) que todavía no tiene sus llaves configuradas, el pedido se registra igual pero nunca se cobra de verdad — el cliente puede pensar que pagó sin que el cobro se haya procesado.',
    confusion: 'El switch de esa pasarela puede estar "activado" en Configuración sin tener las llaves cargadas, y nada en pantalla avisa que está encendida pero no funcional.',
    tutorial: [
      'Ve a Configuración → Métodos de pago.',
      'Revisa que la pasarela que usó el cliente tenga sus llaves realmente guardadas (no solo el switch activado).',
      'Si no las tiene, considera apagar ese método mientras no esté listo, para no confundir a más clientes.',
    ],
  },
  {
    categoria: 'Pagos',
    pregunta: '¿Dónde configuro las llaves de Mercado Pago, PayPal, BBVA o Stripe?',
    explicacion: 'Todas las credenciales de las 4 pasarelas viven en el mismo lugar, en una tarjeta que dice "🔑 Claves de pago".',
    confusion: 'El nombre de la sección ("Métodos de pago") no deja claro que ahí también se guardan credenciales sensibles — hay que entrar para descubrirlo.',
    tutorial: [
      'Configuración → Métodos de pago.',
      'Activa el switch de la pasarela que quieras usar.',
      'Baja hasta la tarjeta "🔑 Claves de pago" y llena los campos de esa pasarela.',
      'Guarda — los campos secretos no vuelven a mostrar su valor una vez guardados, es normal.',
    ],
  },
  {
    categoria: 'Dashboard',
    pregunta: '¿Por qué algunas tarjetas del Dashboard se pueden clickear y otras no?',
    explicacion: 'La mayoría de las tarjetas te llevan a la pantalla relacionada con esa métrica. "Productos rechazados" y "Productos sin stock" son solo informativas — no existe todavía una pantalla dedicada a listar esos datos.',
    confusion: 'No hay ninguna señal visual que distinga cuáles se pueden tocar y cuáles no, hasta que le pasas el mouse encima.',
    tutorial: [
      'Prueba a pasar el mouse sobre una tarjeta — si el cursor cambia a "manita", es clickeable.',
      '"Pendientes de aprobación" te lleva a Productos con el panel de solicitudes ya abierto.',
      '"Proveedores registrados" te lleva a Clientes con la pestaña Proveedores ya abierta.',
    ],
  },
]

const CATEGORIAS = Array.from(new Set(PREGUNTAS.map(p => p.categoria)))

export default function AyudaPanel() {
  const [abierto, setAbierto] = useState(false)
  const [activa, setActiva] = useState<Pregunta | null>(null)

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setAbierto(v => !v)} title="Ayuda del panel"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', border: '1px solid #e5e7eb', background: abierto ? NAVY : '#fff', color: abierto ? '#fff' : '#374151', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
        ?
      </button>

      {abierto && (
        <>
          <div onClick={() => setAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: 42, right: 0, width: 340, maxHeight: 440, overflowY: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.18)', border: '1px solid #e5e7eb', zIndex: 50, padding: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 10px 4px' }}>Preguntas frecuentes del panel</p>
            {CATEGORIAS.map(cat => (
              <div key={cat}>
                <p style={{ fontSize: 11, fontWeight: 700, color: BLUE, padding: '8px 10px 2px', margin: 0 }}>{cat}</p>
                {PREGUNTAS.filter(p => p.categoria === cat).map(p => (
                  <button key={p.pregunta} onClick={() => { setActiva(p); setAbierto(false) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'none', borderRadius: 8, fontSize: 13, color: '#374151', cursor: 'pointer', lineHeight: 1.35 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}>
                    {p.pregunta}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {activa && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setActiva(null) }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: BLUE, margin: '0 0 4px' }}>{activa.categoria}</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>{activa.pregunta}</h3>
              </div>
              <button onClick={() => setActiva(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', flexShrink: 0 }}>×</button>
            </div>
            <div style={{ padding: '18px 24px 24px' }}>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, margin: '0 0 16px' }}>{activa.explicacion}</p>

              <p style={{ fontSize: 11, fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>⚠️ Confusión común</p>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55, margin: '0 0 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px' }}>{activa.confusion}</p>

              <p style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>✅ Cómo hacerlo</p>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'decimal' }}>
                {activa.tutorial.map((paso, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, display: 'list-item' }}>{paso}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
