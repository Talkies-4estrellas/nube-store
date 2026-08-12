/**
 * Convierte cualquier imagen a WebP usando Canvas API del navegador (cero dependencias).
 * Solo funciona en componentes 'use client'.
 *
 * Proceso:
 * 1. Carga el File/Blob en un <img>
 * 2. Lo dibuja en un <canvas>
 * 3. Exporta con canvas.toBlob('image/webp', calidad)
 */
export function convertToWebp(file: File | Blob, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas no disponible')); return }

      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Error al convertir a WebP')); return }
          const nombre = (file instanceof File ? file.name : 'foto')
            .replace(/\.[^.]+$/, '') + '.webp'
          resolve(new File([blob], nombre, { type: 'image/webp' }))
        },
        'image/webp',
        quality,
      )
    }

    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = url
  })
}

/**
 * Captura un frame de un <video> de cámara y lo devuelve como File WebP.
 */
export function captureFrameAsWebp(
  video: HTMLVideoElement,
  quality = 0.82,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) { reject(new Error('Canvas no disponible')); return }

    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Error al capturar frame')); return }
        const nombre = `foto-${Date.now()}.webp`
        resolve(new File([blob], nombre, { type: 'image/webp' }))
      },
      'image/webp',
      quality,
    )
  })
}

/**
 * Convierte un File/Blob a base64 puro (sin el prefijo `data:...;base64,`),
 * para mandarlo tal cual al endpoint de mejora de imágenes con IA.
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? result)
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

/**
 * Convierte un base64 (como el que devuelve Gemini) de vuelta a un File WebP,
 * reutilizando el mismo pipeline de convertToWebp para que el resultado quede
 * en el mismo formato que cualquier otra imagen subida normalmente.
 */
export async function base64ToWebpFile(base64: string, mimeType: string, nombre = 'mejorada'): Promise<File> {
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  const blob = new Blob([arr], { type: mimeType })
  return convertToWebp(new File([blob], nombre, { type: mimeType }))
}

/**
 * Sube un File WebP directamente a Supabase Storage.
 * Devuelve la URL pública del archivo.
 */
export async function uploadToSupabase(
  file: File,
  supabaseClient: import('@supabase/supabase-js').SupabaseClient,
  bucket: string,
  path: string,
): Promise<string> {
  const { error } = await supabaseClient.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: 'image/webp' })

  if (error) throw new Error(error.message)

  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
