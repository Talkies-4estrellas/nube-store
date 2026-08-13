'use client'

import { useState } from 'react'

const NAVY = '#252855'
const BLUE = '#0049ff'

type Pregunta = {
  categoria: string
  pregunta: string
  explicacion: string
  confusion: string
  porQuePasa: string
  solucion: string
  tutorial: string[]
}

const PREGUNTAS: Pregunta[] = [
  {
    categoria: 'Gestión',
    pregunta: '¿Dónde encuentro los productos de mis proveedores?',
    explicacion: 'Todos los productos —los tuyos y los de tus proveedores— viven juntos en la misma pantalla de Productos. Un producto de proveedor se distingue por la etiqueta "📦" con el nombre del proveedor debajo del SKU.',
    confusion: 'Se busca una sección aparte solo para "productos de proveedores" y no existe — todos están mezclados en el mismo catálogo, filtrables por proveedor.',
    porQuePasa: 'En la mayoría de las tiendas online, "productos propios" y "de terceros" se manejan por separado. Aquí se decidió mezclarlos en un solo catálogo para que el admin nunca tenga que pensar "¿esto es mío o de alguien más?" al gestionar inventario, pero eso rompe la expectativa de tener una lista aparte.',
    solucion: 'Usar siempre el filtro "📦 Proveedores" arriba de la tabla cuando se busque solo lo de un proveedor específico, en vez de intentar encontrar una pantalla separada.',
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
    porQuePasa: 'El panel de solicitudes se diseñó como algo que se abre "cuando hace falta" para no ocupar espacio permanente en la pantalla de Productos, pero eso significa que su existencia depende de que el admin recuerde revisarlo.',
    solucion: 'El número junto al botón "Solicitudes" (y la tarjeta del Dashboard) es la señal a la que hay que acostumbrarse — revisar el Dashboard al iniciar el día es más confiable que recordar entrar a Productos a buscarlo manualmente.',
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
    porQuePasa: 'Clientes y Proveedores comparten mucha lógica en común (son "cuentas" de personas relacionadas con la tienda), así que se combinaron en una sola pantalla con pestañas para no duplicar código — pero eso oculta a los proveedores detrás de un menú que, por nombre, suena a que es solo para clientes.',
    solucion: 'La forma más rápida es usar Ctrl+K (búsqueda global) y escribir "proveedor" en vez de buscarlo en el menú — o simplemente acostumbrarse a que "Clientes" en este panel significa "personas y negocios", no solo compradores.',
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
    porQuePasa: 'El sistema de chat se separó en dos según el tipo de conversación (con o sin producto asociado) para que el admin no tenga que leer decenas de mensajes de soporte general buscando los que sí requieren revisar un producto — pero los nombres elegidos ("Mensajes" y "Comentarios") no comunican esa diferencia por sí solos.',
    solucion: 'Pensarlo así: si el cliente mencionó un producto, va a "Mensajes"; si fue una queja o duda general (envíos, cuenta, etc.), va a "Comentarios". Revisar ambos con la misma frecuencia hasta que se vuelva costumbre.',
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
    porQuePasa: 'Son dos procesos de aprobación distintos que nacieron en momentos distintos del desarrollo del proyecto (primero se armó la aprobación de productos, después la de registro de proveedores nuevos) y cada una se colocó junto a la pantalla más relacionada con su tema, sin unificarlas en un solo lugar de "cosas por aprobar".',
    solucion: 'Regla simple: "aprobar un producto" → Productos. "Aprobar una persona nueva" → Clientes → Proveedores. El Dashboard también avisa de ambas por separado, en tarjetas distintas.',
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
    porQuePasa: 'La palabra "Pendiente" en el uso cotidiano suena a alerta o problema, pero aquí es simplemente el primer paso técnico del flujo — todo pedido nace así, incluso los que van a terminar pagándose sin problema segundos después.',
    solucion: 'No tratar "Pendiente" como una alarma — solo hay que actuar si un pedido se queda ahí mucho tiempo sin avanzar (eso sí puede indicar que el cliente no completó el pago).',
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
    porQuePasa: 'El sistema solo puede confirmar automáticamente un pago cuando existe una pasarela electrónica de por medio que le avise ("webhook"). El efectivo y la transferencia bancaria directa no tienen forma de avisarle al sistema por sí solos — nadie más que un humano puede confirmar que ese dinero realmente llegó.',
    solucion: 'Revisar periódicamente los pedidos en "Pendiente" con método Efectivo/Transferencia y marcarlos manualmente en cuanto se confirme el pago, en vez de esperar a que cambien solos.',
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
    porQuePasa: 'Cada aspecto de la tienda pública (menús, filtros, redes sociales, footer, navegación móvil...) se separó en su propia pantalla para que cada una fuera más simple individualmente, pero eso multiplica el número de lugares donde algo "podría estar".',
    solucion: 'Empezar siempre por "Diseño" para lo más visual/general, y usar la vista previa en vivo para confirmar si el cambio que buscas está ahí antes de ir a buscar en otra sub-sección.',
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
    porQuePasa: 'La función original (un blog de artículos) se descartó y se reaprovechó esa misma pantalla para el carrusel de fotos, cambiando el nombre visible pero sin renombrar internamente la dirección web (`/blog`) por no romper enlaces que ya existieran.',
    solucion: 'Guiarse siempre por el nombre que aparece en el menú ("Carrusel"), no por la URL — la URL es un detalle técnico que no necesitas conocer para usar el panel.',
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
    porQuePasa: 'El switch de "método de pago activo" y las credenciales de esa pasarela son dos configuraciones independientes entre sí en el sistema — activar una no valida ni depende de la otra, así que es perfectamente posible (y fácil) dejar una encendida sin llaves sin que nada lo marque como error.',
    solucion: 'Antes de activar el switch de cualquier pasarela, confirmar primero que sus 2-3 campos de credenciales ya están guardados en "🔑 Claves de pago" — activar el switch debería ser siempre el último paso, no el primero.',
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
    porQuePasa: '"Métodos de pago" describe la parte que ve el cliente (qué opciones tiene para pagar); las credenciales técnicas para que esas opciones funcionen de verdad se agregaron después, en la misma pantalla, por comodidad de tenerlo todo junto — pero el nombre nunca se actualizó para reflejar que también vive ahí lo sensible.',
    solucion: 'Recordar que en esta pantalla hay dos cosas distintas apiladas: arriba, qué ve el cliente (switches); abajo, las credenciales técnicas ("🔑 Claves de pago") — conviene revisar siempre las dos partes juntas.',
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
    porQuePasa: 'Las tarjetas se diseñaron primero todas iguales visualmente (antes ninguna era clickeable); cuando se agregó la navegación, se hizo por dato disponible y no todas las métricas tenían todavía una pantalla propia a donde llevar — el diseño visual no se actualizó para reflejar esa diferencia.',
    solucion: 'Por ahora, pasar el mouse encima es la única forma de saberlo (cambia el cursor). Sería una mejora futura agregarles alguna señal visual (una flechita, por ejemplo) a las que sí navegan.',
    tutorial: [
      'Prueba a pasar el mouse sobre una tarjeta — si el cursor cambia a "manita", es clickeable.',
      '"Pendientes de aprobación" te lleva a Productos con el panel de solicitudes ya abierto.',
      '"Proveedores registrados" te lleva a Clientes con la pestaña Proveedores ya abierta.',
    ],
  },
  {
    categoria: 'Usuarios',
    pregunta: '¿Cómo doy de alta a un empleado nuevo (vendedor, bodega, u otro admin)?',
    explicacion: 'No se puede hacer desde ningún botón del panel — hay que entrar directo a Supabase (el sistema donde vive la base de datos), crear el usuario ahí en Authentication → Users, y luego agregar su rol a mano en la tabla user_roles.',
    confusion: 'Es la única gestión de "personas" en todo el panel que no tiene una pantalla propia — todo lo demás (clientes, proveedores) sí se puede administrar sin salir del panel, así que se espera que esto también se pueda.',
    porQuePasa: 'Crear cuentas de empleados requiere permisos muy delicados (define quién puede entrar al negocio como si fuera dueño), y todavía no se construyó una pantalla propia en el panel para hacerlo de forma segura — mientras tanto, se dejó como una tarea manual directamente en Supabase, la herramienta técnica detrás del panel.',
    solucion: 'Mientras no exista esa pantalla, seguir el mensaje que ya aparece en Configuración → Usuarios y roles ("crea el usuario en Supabase, luego agrega su rol") o pedirle a quien tenga acceso técnico al proyecto que lo haga. Los roles YA creados sí se pueden cambiar o quitar desde el panel, sin volver a Supabase.',
    tutorial: [
      'Ve a Configuración → Usuarios y roles para ver el mensaje con los pasos y la lista de quién ya tiene acceso.',
      'La creación inicial del usuario requiere entrar a Supabase (Authentication → Users → Add user) — esto normalmente lo hace quien administra el proyecto técnicamente.',
      'Una vez creado en Supabase, se agrega su rol correspondiente en la tabla user_roles.',
      'A partir de ahí, cambiar su rol o quitarle el acceso ya sí se puede hacer desde esta misma pantalla del panel.',
    ],
  },
  {
    categoria: 'Usuarios',
    pregunta: '¿Dónde está el Punto de Venta?',
    explicacion: 'Existe una pantalla de Punto de Venta (para vender directo en mostrador, sin que el cliente pase por la tienda en línea), pero no aparece en el menú lateral — hay que entrar escribiendo la dirección directamente.',
    confusion: 'No hay ningún botón ni enlace visible en todo el panel que lleve ahí — es la única pantalla completa del sistema que solo se puede alcanzar sabiendo de memoria que existe.',
    porQuePasa: 'Es un descuido real: la pantalla se construyó y los permisos por rol ya la incluyen, pero se quedó sin agregar al menú lateral — no fue una decisión de diseño, simplemente se quedó pendiente.',
    solucion: 'Esta es una de las pocas cosas de esta lista que no depende de "aprender dónde está" sino que realmente falta agregarse al menú — vale la pena resolverlo agregando el enlace, no solo explicándolo.',
    tutorial: [
      'Por ahora, entra escribiendo la dirección directamente después del dominio de tu panel: /punto-de-venta',
      'Ahí puedes armar una venta directa (mostrador) igual que un pedido normal, pero sin pasar por el checkout de la tienda pública.',
      'Pídele a Claude que agregue el enlace al menú lateral si quieres tenerlo a la mano de forma permanente.',
    ],
  },
  {
    categoria: 'Envíos',
    pregunta: '¿Dónde configuro las medidas y el peso de los paquetes de un proveedor?',
    explicacion: 'Vive dentro de Envíos, en la pestaña "Paquetes por proveedor" — junto a las otras dos pestañas que son del día a día (Por enviar, Envíos activos).',
    confusion: 'Es una configuración que se hace una sola vez por proveedor (no algo que se revise a diario como las otras dos pestañas), pero está mezclada al mismo nivel que el trabajo operativo diario de envíos.',
    porQuePasa: 'Se agrupó ahí porque el dato (medidas/peso) se usa específicamente para calcular envíos, así que técnicamente pertenece al mismo tema — pero desde el punto de vista de "qué tan seguido lo uso", es un tipo de tarea distinto (configuración puntual) al de las otras dos pestañas (trabajo diario).',
    solucion: 'Configurar las medidas de cada proveedor una vez, al darlo de alta, y no esperar tener que volver seguido — a diferencia de "Por enviar"/"Envíos activos", que sí hay que revisar todos los días.',
    tutorial: [
      'Clic en Envíos en el menú lateral.',
      'Pestaña "Paquetes por proveedor".',
      'Elige el proveedor y llena las medidas/peso de sus paquetes estándar.',
      'Esto alimenta el cálculo automático de costos de envío para sus productos.',
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
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55, margin: 0 }}>{activa.confusion}</p>
                <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.55, margin: 0 }}><strong>¿Por qué pasa?</strong> {activa.porQuePasa}</p>
                <p style={{ fontSize: 12, color: '#166534', lineHeight: 1.55, margin: 0 }}><strong>Posible solución:</strong> {activa.solucion}</p>
              </div>

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
