# ============================================================
#  Exporta los DATOS de la base vieja de Supabase
#
#  Usa pg_dump DIRECTAMENTE (sin el CLI de Supabase, sin Docker).
#  El CLI de Supabase ("supabase db dump") requiere Docker Desktop
#  incluso para bases remotas, porque corre pg_dump dentro de un
#  contenedor. Este script evita esa dependencia pesada llamando
#  a pg_dump.exe directo contra la cadena de conexion.
#
#  REQUISITO: pg_dump instalado (ver instrucciones si falta abajo).
#
#  USO:
#    .\scripts\exportar-datos.ps1
#
#  Pide la cadena de conexion de forma segura (no queda en el
#  historial de la terminal).
# ============================================================

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "=== Exportar datos de Supabase (via pg_dump) ===" -ForegroundColor Cyan
Write-Host ""

# ---- Verificar que pg_dump este disponible ----
# Se busca primero en el PATH normal. Si el instalador acaba de correr,
# Windows todavia no actualiza el PATH de una terminal ya abierta (hace
# falta reiniciarla), asi que como respaldo se buscan tambien las rutas
# tipicas de instalacion de PostgreSQL en Program Files.
$pgDumpCmd = Get-Command pg_dump -ErrorAction SilentlyContinue
$pgDumpExe = if ($pgDumpCmd) { $pgDumpCmd.Source } else { $null }

if (-not $pgDumpExe) {
  $candidatos = @(
    "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe",
    "C:\Program Files (x86)\PostgreSQL\*\bin\pg_dump.exe"
  )
  $encontrado = Get-ChildItem -Path $candidatos -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
  if ($encontrado) {
    $pgDumpExe = $encontrado.FullName
    Write-Host "pg_dump encontrado en: $pgDumpExe" -ForegroundColor DarkGray
    Write-Host "(no esta en el PATH todavia; cierra y abre la terminal para que" -ForegroundColor DarkGray
    Write-Host " se reconozca automaticamente la proxima vez)" -ForegroundColor DarkGray
    Write-Host ""
  }
}

if (-not $pgDumpExe) {
  Write-Host "ERROR: pg_dump no esta instalado." -ForegroundColor Red
  Write-Host ""
  Write-Host "Es una herramienta ligera (no es Docker ni un servidor de base de" -ForegroundColor Yellow
  Write-Host "datos completo): son solo los comandos de linea de PostgreSQL." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Instalar con winget (recomendado):" -ForegroundColor Cyan
  Write-Host "  winget install -e --id PostgreSQL.PostgreSQL.17"
  Write-Host ""
  Write-Host "O descargar el instalador oficial y elegir SOLO Command Line Tools" -ForegroundColor Cyan
  Write-Host "  (desmarcar Server, pgAdmin y Stack Builder):"
  Write-Host "  https://www.postgresql.org/download/windows/"
  Write-Host ""
  Write-Host "Tras instalar, cierra y vuelve a abrir la terminal antes de reintentar." -ForegroundColor Yellow
  exit 1
}

Write-Host "Necesitas la cadena de conexion de la base VIEJA."
Write-Host "La sacas en: Dashboard -> boton verde 'Connect' -> Connection string -> URI"
Write-Host ""
Write-Host "Se ve asi:" -ForegroundColor DarkGray
Write-Host "  postgresql://postgres:TU-PASSWORD@db.xxxxx.supabase.co:5432/postgres" -ForegroundColor DarkGray
Write-Host ""

# Se pide como texto seguro para que no quede en el historial
$secure = Read-Host "Pega la cadena de conexion" -AsSecureString
$dbUrl = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
)

if (-not $dbUrl -or -not $dbUrl.StartsWith('postgresql://')) {
  Write-Host "ERROR: la cadena debe empezar con postgresql://" -ForegroundColor Red
  exit 1
}

$salida = Join-Path $PSScriptRoot '..\respaldo'
New-Item -ItemType Directory -Force -Path $salida | Out-Null
$fecha = Get-Date -Format 'yyyy-MM-dd'

# pg_dump 17.6+ envuelve el dump en texto plano con `\restrict` /
# `\unrestrict` (parche de seguridad CVE-2025-8714). Son comandos
# exclusivos de psql; cualquier otro cliente SQL (incluido el SQL
# Editor de Supabase) truena con "syntax error at or near \". Se
# quitan esas lineas del archivo despues de generarlo.
function Quitar-MetacomandosPsql([string]$Ruta) {
  # OJO: pg_dump escribe UTF-8 SIN BOM. Get-Content sin -Encoding en
  # PowerShell 5.1 asume la codificacion ANSI del sistema en vez de UTF-8,
  # lo que corrompe cualquier acento (ej. "Electronica" -> "ElectrÃ³nica").
  # Especificar -Encoding UTF8 en la LECTURA es obligatorio aqui.
  (Get-Content -Path $Ruta -Encoding UTF8) |
    Where-Object { $_ -notmatch '^\s*\\(restrict|unrestrict)\b' } |
    Set-Content -Path $Ruta -Encoding utf8
}

# Solo el esquema public: auth/storage/realtime los maneja Supabase aparte
# (usuarios se recrean a mano, imagenes con scripts/copiar-imagenes.mjs).
Write-Host ""
Write-Host "1/2  Exportando ESQUEMA (referencia)..." -ForegroundColor Yellow
$archivoEsquema = Join-Path $salida "esquema-$fecha.sql"
& $pgDumpExe $dbUrl --schema=public --schema-only --no-owner --no-privileges -f $archivoEsquema
if ($LASTEXITCODE -ne 0) { Write-Host "Fallo el dump de esquema" -ForegroundColor Red; exit 1 }
Quitar-MetacomandosPsql $archivoEsquema

Write-Host ""
Write-Host "2/2  Exportando DATOS como INSERTs..." -ForegroundColor Yellow
# --column-inserts genera INSERT con nombres de columna explicitos:
# se puede pegar directo en el SQL Editor (a diferencia de COPY, que
# necesita un cliente con stream de datos y no funciona pegado en la web).
$archivoDatos = Join-Path $salida "datos-$fecha.sql"
& $pgDumpExe $dbUrl --schema=public --data-only --column-inserts --no-owner --no-privileges -f $archivoDatos
if ($LASTEXITCODE -ne 0) { Write-Host "Fallo el dump de datos" -ForegroundColor Red; exit 1 }
Quitar-MetacomandosPsql $archivoDatos

# Anteponer la desactivacion de triggers para que trg_descontar_stock
# no vuelva a descontar inventario al insertar las ventas historicas
$contenido = Get-Content $archivoDatos -Raw
$encabezado = @'
-- Desactiva los triggers durante la carga.
-- Sin esto, trg_descontar_stock descontaria el inventario otra vez
-- al insertar las ventas historicas.
SET session_replication_role = replica;

'@
Set-Content -Path $archivoDatos -Value ($encabezado + $contenido) -Encoding utf8

Write-Host ""
Write-Host "LISTO" -ForegroundColor Green
Write-Host "  Esquema: $archivoEsquema"
Write-Host "  Datos:   $archivoDatos"
Write-Host ""
Write-Host "SIGUIENTE PASO en el proyecto NUEVO:" -ForegroundColor Cyan
Write-Host "  1. SQL Editor -> pegar y ejecutar Doc/database/schema_completo.sql"
Write-Host "  2. SQL Editor -> pegar y ejecutar respaldo/datos-$fecha.sql"
Write-Host "  3. Crear el usuario admin en Authentication e insertarlo en user_roles"
Write-Host "  4. node scripts/copiar-imagenes.mjs  (copia las imagenes del bucket)"
Write-Host ""
