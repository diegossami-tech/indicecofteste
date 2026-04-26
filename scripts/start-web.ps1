$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$serverPath = Join-Path $projectRoot "web\server.js"

if (-not (Test-Path -LiteralPath $serverPath)) {
    throw "Servidor web nao encontrado em $serverPath"
}

Write-Host "Iniciando consulta web do COF em http://127.0.0.1:4173"
node $serverPath
