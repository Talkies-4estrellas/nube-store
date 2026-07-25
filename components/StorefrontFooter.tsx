'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin } from 'lucide-react'
import { isValidEmail } from '@/lib/validation'

/* lucide-react no incluye logos de marca (Instagram/Facebook/YouTube) —
   se removieron del paquete hace tiempo, así que van como SVG propios. */
function Instagram({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function Facebook({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h-2a5 5 0 0 0-5 5v3H6v4h2v6h4v-6h3l1-4h-4V8a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}
function Youtube({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  )
}

type FooterConfig = {
  nombre_tienda: string
  color_acento: string
  whatsapp: string
  telefono: string
  footer_telefono_2: string
  email_contacto: string
  instagram: string
  facebook: string
  youtube: string
  footer_direccion: string
  footer_copyright: string
  footer_newsletter_activo: boolean
  footer_paginas: { label: string; url: string }[]
  footer_envios_logos: { nombre: string; logo_url: string }[]
}

type Props = {
  config: FooterConfig
}

export default function StorefrontFooter({ config }: Props) {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'idle' | 'ok' | 'error'>('idle')

  function enviarNewsletter(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidEmail(email)) { setEstado('error'); return }
    setEstado('ok')
    setEmail('')
    setTimeout(() => setEstado('idle'), 3000)
  }

  const anio = new Date().getFullYear()
  const copyright = config.footer_copyright?.trim()
    || `© ${anio} ${config.nombre_tienda}. Todos los derechos reservados.`

  return (
    <footer className="oe-footer" style={{ background: config.color_acento || '#a51d5c' }}>
      <div className="oe-footer-top">
        <div className="oe-footer-col">
          <p className="oe-footer-brand">{config.nombre_tienda}</p>

          {(config.instagram || config.facebook || config.youtube) && (
            <div className="oe-footer-social">
              {config.instagram && (
                <a href={`https://instagram.com/${config.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
              )}
              {config.facebook && (
                <a href={config.facebook.startsWith('http') ? config.facebook : `https://${config.facebook}`} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={18} /></a>
              )}
              {config.youtube && (
                <a href={config.youtube.startsWith('http') ? config.youtube : `https://${config.youtube}`} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube size={18} /></a>
              )}
            </div>
          )}

          <div className="oe-footer-contact">
            {config.telefono && <p><Phone size={14} /> {config.telefono}</p>}
            {config.footer_telefono_2 && <p><Phone size={14} /> {config.footer_telefono_2}</p>}
            {config.email_contacto && <p><Mail size={14} /> {config.email_contacto}</p>}
            {config.footer_direccion && <p><MapPin size={14} /> {config.footer_direccion}</p>}
          </div>
        </div>

        {config.footer_paginas.length > 0 && (
          <div className="oe-footer-col">
            <p className="oe-footer-heading">Info</p>
            {config.footer_paginas.map((p, i) => (
              <a key={i} href={p.url || '#'}>{p.label}</a>
            ))}
          </div>
        )}

        {config.footer_newsletter_activo && (
          <div className="oe-footer-col">
            <p className="oe-footer-heading">Newsletter</p>
            <form className="oe-footer-newsletter" onSubmit={enviarNewsletter}>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEstado('idle') }}
                placeholder="Correo electrónico"
                aria-label="Correo electrónico"
              />
              <button type="submit">Enviar</button>
            </form>
            {estado === 'ok' && <p className="oe-footer-newsletter-msg">¡Gracias por suscribirte!</p>}
            {estado === 'error' && <p className="oe-footer-newsletter-msg error">Escribe un correo válido.</p>}
          </div>
        )}
      </div>

      {config.footer_envios_logos.length > 0 && (
        <div className="oe-footer-envios">
          <span>Opciones de envío</span>
          {config.footer_envios_logos.map((l, i) => (
            <img key={i} src={l.logo_url} alt={l.nombre} title={l.nombre} />
          ))}
        </div>
      )}

      <div className="oe-footer-bottom">
        <span>{copyright}</span>
      </div>
    </footer>
  )
}
