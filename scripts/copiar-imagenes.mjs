#!/usr/bin/env node
// ============================================================
//  Copia todas las imágenes del bucket 'productos' de un
//  proyecto de Supabase a otro (recorre subcarpetas:
//  solicitudes/, importados/, carrusel/, extra-*, etc.)
//
//  Las imágenes NO viajan en el dump SQL — este script cubre
//  ese hueco. Usa @supabase/supabase-js, que ya es dependencia
//  del proyecto.
//
//  USO:
//    node scripts/copiar-imagenes.mjs
//
//  Pide credenciales por consola (no quedan en el historial de
//  comandos). Necesita la SERVICE ROLE KEY de ambos proyectos
//  (Settings → API → service_role) porque list/upload requieren
//  saltar RLS.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const BUCKET = 'productos'
const CONCURRENCIA = 4 // subidas simultáneas

const rl = readline.createInterface({ input: stdin, output: stdout })

async function preguntar(texto) {
  const r = await rl.question(texto)
  return r.trim()
}

async function main() {
  console.log('\n=== Copiar imágenes entre proyectos de Supabase ===\n')
  console.log('Sacas estos datos en: Dashboard del proyecto → Settings → API\n')

  const urlVieja = await preguntar('URL del proyecto VIEJO (https://xxxx.supabase.co): ')
  const keyVieja = await preguntar('service_role key del proyecto VIEJO: ')
  const urlNueva = await preguntar('URL del proyecto NUEVO (https://xxxx.supabase.co): ')
  const keyNueva = await preguntar('service_role key del proyecto NUEVO: ')
  rl.close()

  if (!urlVieja.startsWith('https://') || !urlNueva.startsWith('https://')) {
    console.error('\n❌ Las URLs deben empezar con https://')
    process.exit(1)
  }

  const origen  = createClient(urlVieja, keyVieja, { auth: { persistSession: false } })
  const destino = createClient(urlNueva, keyNueva, { auth: { persistSession: false } })

  console.log(`\nListando archivos del bucket "${BUCKET}"...`)
  const rutas = await listarRecursivo(origen, '')
  console.log(`Encontrados ${rutas.length} archivos.\n`)

  if (rutas.length === 0) {
    console.log('Nada que copiar.')
    return
  }

  let ok = 0
  let fallidos = []

  // Copiar en lotes con concurrencia limitada
  for (let i = 0; i < rutas.length; i += CONCURRENCIA) {
    const lote = rutas.slice(i, i + CONCURRENCIA)
    await Promise.all(lote.map(async (path) => {
      try {
        const { data: blob, error: errDown } = await origen.storage.from(BUCKET).download(path)
        if (errDown) throw errDown

        const buffer = Buffer.from(await blob.arrayBuffer())
        const { error: errUp } = await destino.storage
          .from(BUCKET)
          .upload(path, buffer, { contentType: blob.type || 'image/webp', upsert: true })
        if (errUp) throw errUp

        ok++
        process.stdout.write(`\r✓ ${ok}/${rutas.length} copiados...`)
      } catch (e) {
        fallidos.push({ path, error: e instanceof Error ? e.message : String(e) })
      }
    }))
  }

  console.log('\n\n=== Resultado ===')
  console.log(`✓ Copiados: ${ok}`)
  console.log(`✗ Fallidos: ${fallidos.length}`)
  if (fallidos.length > 0) {
    console.log('\nArchivos que fallaron:')
    fallidos.forEach(f => console.log(`  - ${f.path}: ${f.error}`))
  }
}

/** Lista todos los archivos del bucket recorriendo subcarpetas. */
async function listarRecursivo(client, prefijo) {
  const { data, error } = await client.storage.from(BUCKET).list(prefijo, { limit: 1000 })
  if (error) {
    console.error(`Error listando "${prefijo}": ${error.message}`)
    return []
  }

  let rutas = []
  for (const item of data) {
    const ruta = prefijo ? `${prefijo}/${item.name}` : item.name
    // Las carpetas no tienen `id`; los archivos sí.
    if (item.id === null) {
      rutas = rutas.concat(await listarRecursivo(client, ruta))
    } else {
      rutas.push(ruta)
    }
  }
  return rutas
}

main().catch(e => {
  console.error('\nError inesperado:', e)
  process.exit(1)
})
