'use client'

import Image from 'next/image'

export default function Topbar() {
  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 240,
      right: 0,
      height: 56,
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 24px',
      zIndex: 99,
      gap: 12,
    }}>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4, borderRadius: 6 }}>🔍</button>
      <button style={{
        background: 'none',
        border: '2px solid #0049ff',
        color: '#0049ff',
        fontWeight: 700,
        fontSize: 13,
        padding: '5px 14px',
        borderRadius: 20,
        cursor: 'pointer',
      }}>✨ Lumi</button>
      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4 }}>❓</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, background: '#0049ff', color: '#fff',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0,
        }}>OE</div>
        <Image
          src="/imagenes/logo-oe_1-png-300x49.avif"
          alt="Order Express"
          width={110}
          height={18}
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    </header>
  )
}
