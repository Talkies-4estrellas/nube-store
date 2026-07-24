/** Ventana de números de página a mostrar (1, última, actual ±1) con "…"
 * para los huecos, en vez de listar todas las páginas — con catálogos
 * grandes eso se sale de la pantalla. */
export function paginasVisibles(actual: number, total: number): (number | '...')[] {
  const set = new Set<number>([1, total, actual - 1, actual, actual + 1])
  const nums = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b)
  const out: (number | '...')[] = []
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push('...')
    out.push(n)
  })
  return out
}
