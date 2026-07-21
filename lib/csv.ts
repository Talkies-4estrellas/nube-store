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

/**
 * Detecta el separador del CSV mirando la primera línea.
 * Tiendanube y Excel en español exportan con ';'.
 */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  const counts: Record<string, number> = {
    ',': (firstLine.match(/,/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
    '\t': (firstLine.match(/\t/g) || []).length,
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * Lee un archivo detectando la codificación.
 * Si al decodificar como UTF-8 aparece el carácter de reemplazo (), el archivo
 * casi seguro viene en Latin-1 / Windows-1252 (exports de Tiendanube, Excel viejo).
 */
export function readFileSmart(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => {
      const utf8 = String(reader.result)
      if (!utf8.includes('�')) { resolve(utf8); return }
      // Reintentar como Windows-1252
      const r2 = new FileReader()
      r2.onerror = () => resolve(utf8)
      r2.onload = () => resolve(String(r2.result))
      r2.readAsText(file, 'windows-1252')
    }
    reader.readAsText(file, 'UTF-8')
  })
}

/** Parsea el texto a matriz de celdas respetando comillas y saltos de línea. */
function parseRows(text: string, sep: string): string[][] {
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
      else if (c === sep) { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); field = ''; row = [] }
      else if (c === '\r') { /* se ignora; el fin de fila lo marca \n */ }
      else field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

/**
 * Rescata archivos ';'-delimitados que fueron re-guardados envueltos como CSV
 * de comas (típico de un export de Tiendanube abierto y guardado en Excel).
 *
 * En esos archivos las descripciones con HTML quedan partidas en varias líneas
 * físicas y con comillas descuadradas. Se reagrupan detectando dónde empieza
 * cada registro: un identificador de URL seguido de ';'.
 */
function parseEnvueltoPorPuntoYComa(text: string): string[][] {
  const lineas = text.split(/\r?\n/)
  const esInicioRegistro = /^"?[a-z0-9][a-z0-9-]{2,};/i

  const bloques: string[] = []
  let actual: string | null = null
  lineas.forEach((linea, i) => {
    if (i === 0) { actual = linea; return }              // encabezado
    if (esInicioRegistro.test(linea)) {
      if (actual !== null) bloques.push(actual)
      actual = linea
    } else if (actual !== null && linea.trim()) {
      actual += ' ' + linea                               // continuación
    }
  })
  if (actual !== null) bloques.push(actual)

  return bloques.map(b => {
    const campos = parseRows(b, ',')[0] ?? []
    return parseRows(campos.join(','), ';')[0] ?? []
  })
}

/** Parsea texto CSV respetando comillas y saltos de línea dentro de campos. */
export function parseCSV(text: string, delimiter?: string): Record<string, string>[] {
  text = text.replace(/^﻿/, '') // quitar BOM

  let rows = parseRows(text, delimiter || detectDelimiter(text))

  // ¿El archivo es ';'-delimitado pero viene envuelto como CSV de comas?
  if (!delimiter && rows.length > 0) {
    const porComa = parseRows(text, ',')
    const headerUnido = porComa[0]?.join(',') ?? ''
    const puntoComas = (headerUnido.match(/;/g) || []).length
    if (puntoComas >= 3 && (rows[0]?.length ?? 0) < puntoComas) {
      rows = parseEnvueltoPorPuntoYComa(text)
    }
  }

  if (rows.length === 0) return []

  const headers = rows[0].map(h => h.trim().replace(/^"+|"+$/g, ''))
  return rows.slice(1)
    .filter(r => r.some(v => v.trim() !== '')) // saltar filas totalmente vacías
    .map(r => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
      return obj
    })
}

/**
 * Limpia un número que puede venir como "$ 139", "3,500.00", "1.234,56" o "45.00%".
 * Devuelve null si no hay un número reconocible.
 */
export function cleanNumber(raw: string): number | null {
  if (!raw) return null
  let s = String(raw).replace(/[^\d.,-]/g, '').trim()
  if (!s) return null

  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')

  if (lastDot !== -1 && lastComma !== -1) {
    // Ambos presentes: el ÚLTIMO es el separador decimal
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (lastComma !== -1) {
    // Solo coma: decimal si deja 1-2 dígitos ("12,50"), miles si deja 3 ("3,500")
    const decimals = s.length - lastComma - 1
    s = decimals <= 2 ? s.replace(',', '.') : s.replace(/,/g, '')
  }

  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

const ENTIDADES: Record<string, string> = {
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü',
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
}

/** Convierte HTML a texto plano (descripciones de Tiendanube vienen con markup). */
export function stripHtml(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, e) => ENTIDADES[e] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
