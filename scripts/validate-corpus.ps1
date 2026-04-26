$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_shared.ps1")

$corpusPath = Resolve-CorpusPath

if (-not (Test-Path -LiteralPath $corpusPath)) {
    throw "Corpus nao encontrado em $corpusPath"
}

$file = Get-Item -LiteralPath $corpusPath
$header = Get-Content -LiteralPath $corpusPath -TotalCount 8

Write-Host "Corpus localizado com sucesso." -ForegroundColor Green
Write-Host "Resumo:"
Write-Host "  Caminho: $($file.FullName)"
Write-Host "  Tamanho: $([Math]::Round($file.Length / 1MB, 2)) MB"
Write-Host "  Ultima alteracao: $($file.LastWriteTime)"
Write-Host ""
Write-Host "Cabecalho:"
$header | ForEach-Object { Write-Host "  $_" }
