'use client'

type Props = {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Eliminar', onConfirm, onCancel, danger = true }: Props) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '24px 28px 0' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: danger ? '#fee2e2' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={danger ? '#dc2626' : '#d97706'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
            </svg>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 8 }}>{title}</h3>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '20px 28px 24px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel}
            style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: danger ? '#dc2626' : '#d97706', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
