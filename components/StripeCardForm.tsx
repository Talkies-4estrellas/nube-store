'use client'

import { useState, useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const BLUE = '#0049ff'

function Formulario({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [enviando, setEnviando] = useState(false)

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setEnviando(true)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })
    if (error) {
      setEnviando(false)
      onError(error.message || 'No se pudo procesar el pago')
      return
    }
    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onSuccess()
    } else {
      setEnviando(false)
      onError('El pago no se pudo confirmar')
    }
  }

  return (
    <form onSubmit={confirmar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || enviando}
        style={{ background: enviando ? '#93c5fd' : BLUE, color: '#fff', border: 'none', padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: enviando ? 'default' : 'pointer', width: '100%' }}>
        {enviando ? 'Procesando...' : 'Pagar'}
      </button>
    </form>
  )
}

export default function StripeCardForm({
  clientSecret, publishableKey, onSuccess, onError,
}: {
  clientSecret: string
  publishableKey: string
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  // loadStripe() no debe llamarse en cada render — se resuelve una sola vez
  // por publishableKey, incluso si el componente se vuelve a montar.
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey])

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <Formulario onSuccess={onSuccess} onError={onError} />
    </Elements>
  )
}
