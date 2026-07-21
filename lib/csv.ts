// Utilidades CSV sin dependencias externas

function escapeCSV(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Genera texto CSV (con BOM UTF-8 para que Excel muestre acentos/ñ correctamente). */
export function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(escapeCSV).join(',')
  const body = rows.map(r => columns.map(c => escapeCSV(r[c])).join(',')).join('\r\n')
  return '﻿' + header + (body ? '\r\n' + body : '')
}

/** Dispara la descarga de un archivo CSV en el navegador. */
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Parsea texto CSV respetando comillas y saltos de línea dentro de campos. */
export function parseCSV(text: string): Record<string, string>[] {
  text = text.replace(/^﻿/, '') // quitar BOM
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++ }
      else if (c === '"') inQuotes = false
      else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); field = ''; row = [] }
      else if (c === '\r') { /* se ignora; el fin de fila lo marca \n */ }
      else field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  if (rows.length === 0) return []

  const headers = rows[0].map(h => h.trim())
  return rows.slice(1)
    .filter(r => r.some(v => v.trim() !== '')) // saltar filas totalmente vacías
    .map(r => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
      return obj
    })
}
