$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$skillDir = Join-Path $projectRoot "skills\filosofia-olavo-cof"
$distDir = Join-Path $projectRoot "dist"
$zipPath = Join-Path $distDir "filosofia-olavo-cof.zip"

if (-not (Test-Path -LiteralPath $skillDir)) {
    throw "Skill nao encontrada em $skillDir"
}

New-Item -ItemType Directory -Force -Path $distDir | Out-Null

if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path $skillDir -DestinationPath $zipPath -CompressionLevel Optimal

$zip = Get-Item -LiteralPath $zipPath
Write-Host "Pacote criado com sucesso:"
Write-Host "  $($zip.FullName)"
Write-Host "  Tamanho: $([Math]::Round($zip.Length / 1KB, 1)) KB"
