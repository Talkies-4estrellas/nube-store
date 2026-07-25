-- Contenido de la página pública /preguntas-frecuentes
update config_storefront set preguntas_frecuentes = '[
  {
    "pregunta": "¿Qué formas de pago puedo aprovechar para realizar mi compra?",
    "respuesta": "Disponemos de los siguientes medios de pago:\n\nRecomendado: Transferencia o depósito directo a nuestra cuenta bancaria.\n\nAlternativos: Mercado Pago.\n\nPagos en efectivo en: OXXO, Telecomm, 7 Eleven, Farmacias del Ahorro, BBVA, Santander.\n\nTarjetas de débito y/o crédito."
  },
  {
    "pregunta": "¿Cuál es el costo de envío?",
    "respuesta": "El costo de envío se muestra en base al total de la compra y tu ubicación, en el checkout, en el momento previo a la compra."
  },
  {
    "pregunta": "¿Cómo se realizan los envíos?",
    "respuesta": "Trabajamos con diversas paqueterías, siendo la principal Order Express Paquetería y Mensajería; además, también hacemos envíos mediante RedPack, Estafeta y DHL."
  },
  {
    "pregunta": "¿Dónde puedo recibir mi pedido?",
    "respuesta": "Realizamos envíos a todo el país, lo recibes hasta la puerta de tu casa."
  },
  {
    "pregunta": "¿Cuánto tarda en llegar el pedido?",
    "respuesta": "El tiempo de entrega depende del tipo de envío seleccionado. En general, la demora se encuentra entre 3 y 7 días hábiles luego de acreditado el pago."
  },
  {
    "pregunta": "¿Cuál es el plazo para realizar un cambio?",
    "respuesta": "Podemos hacer el cambio de tu producto; sin embargo, es necesario que sepas que en este caso el costo de la paquetería debe ser cubierto por el comprador, por este motivo te pedimos revisar las condiciones de tu compra."
  },
  {
    "pregunta": "¿Qué debo hacer si el producto no llega en buen estado?",
    "respuesta": "Ponte en contacto con nosotros desde la sección de Contacto para darle solución a tu contratiempo con la compra."
  }
]'::jsonb,
updated_at = now()
where id = 1;
