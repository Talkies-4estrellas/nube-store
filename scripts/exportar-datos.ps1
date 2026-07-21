# ============================================================
#  Exporta los DATOS de la base vieja de Supabase
#
#  Genera un archivo con sentencias INSERT que se pueden pegar
#  directamente en el SQL Editor del proyecto nuevo, sin
#  necesidad de tener psql instalado.
#
#  USO:
#    .\scripts\exportar-datos.ps1
#
#  Pide la cadena de conexión de forma segura (no queda en el
#  historial de la terminal).
# ============================================================

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "=== Exportar datos de Supabase ===" -ForegroundColor Cyan
Write-Host ""
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

Write-Host ""
Write-Host "1/2  Exportando ESQUEMA (referencia)..." -ForegroundColor Yellow
$archivoEsquema = Join-Path $salida "esquema-$fecha.sql"
npx --yes supabase db dump --db-url $dbUrl -f $archivoEsquema
if ($LASTEXITCODE -ne 0) { Write-Host "Fallo el dump de esquema" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "2/2  Exportando DATOS como INSERTs..." -ForegroundColor Yellow
# Sin --use-copy para que genere INSERT y se pueda pegar en el SQL Editor
$archivoDatos = Join-Path $salida "datos-$fecha.sql"
npx --yes supabase db dump --db-url $dbUrl -f $archivoDatos --data-only
if ($LASTEXITCODE -ne 0) { Write-Host "Fallo el dump de datos" -ForegroundColor Red; exit 1 }

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
Write-Host "  4. Copiar las imagenes del bucket 'productos' (NO van en el SQL)"
Write-Host ""
