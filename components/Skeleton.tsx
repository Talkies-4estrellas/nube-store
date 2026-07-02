import React from 'react'

const style: React.CSSProperties = {
  background: 'linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 6,
  display: 'inline-block',
}

export function Skeleton({ w = '100%', h = 16, r = 6, style: extra }: { w?: string | number; h?: number; r?: number; style?: React.CSSProperties }) {
  return <div style={{ ...style, width: w, height: h, borderRadius: r, flexShrink: 0, ...extra }} />
}

export function SkeletonRow({ cols }: { cols: (string | number)[] }) {
  return (
    <tr style={{ borderBottom: '1px solid #f9fafb' }}>
      {cols.map((w, i) => (
        <td key={i} style={{ padding: '14px 0' }}>
          <Skeleton w={w} h={14} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTableBody({ rows = 8, cols }: { rows?: number; cols: (string | number)[] }) {
  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} cols={cols} />)}
    </>
  )
}

export function SkeletonCard({ h = 120 }: { h?: number }) {
  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
        <Skeleton w="100%" h={h} r={10} style={{ marginBottom: 12 }} />
        <Skeleton w="70%" h={13} style={{ marginBottom: 8 }} />
        <Skeleton w="40%" h={11} />
      </div>
    </>
  )
}
