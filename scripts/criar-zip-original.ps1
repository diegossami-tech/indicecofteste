# Script PowerShell para empacotar a skill filosofia-olavo-cof num .zip
# Como rodar: clique com o botao direito neste arquivo > "Executar com PowerShell"
# Ou, no PowerShell aberto nesta pasta: .\criar-zip.ps1

$pasta = Join-Path $PSScriptRoot "filosofia-olavo-cof"
$destino = Join-Path $PSScriptRoot "filosofia-olavo-cof.zip"

if (-not (Test-Path $pasta)) {
    Write-Host "ERRO: pasta filosofia-olavo-cof nao encontrada em $PSScriptRoot" -ForegroundColor Red
    Read-Host "Pressione Enter para fechar"
    exit 1
}

if (Test-Path $destino) {
    Remove-Item $destino -Force
    Write-Host "Zip anterior removido."
}

Write-Host "Compactando $pasta ..." -ForegroundColor Cyan
Compress-Archive -Path $pasta -DestinationPath $destino -CompressionLevel Optimal

if (Test-Path $destino) {
    $tamanho = (Get-Item $destino).Length / 1KB
    Write-Host ""
    Write-Host "Pronto! Arquivo criado:" -ForegroundColor Green
    Write-Host "  $destino"
    Write-Host "  Tamanho: $([math]::Round($tamanho, 1)) KB"
    Write-Host ""
    Write-Host "Agora voce pode subir esse .zip em qualquer servico (Drive, Dropbox, WeTransfer etc.) e compartilhar o link." -ForegroundColor Yellow
} else {
    Write-Host "ERRO: nao foi possivel criar o zip." -ForegroundColor Red
}

Read-Host "Pressione Enter para fechar"
