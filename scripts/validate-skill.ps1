$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$skillRoot = Join-Path $projectRoot "skills\filosofia-olavo-cof"

$requiredFiles = @(
    "SKILL.md",
    "README.md",
    "COMO_INSTALAR.md",
    "referencias\como-consultar-corpus.md",
    "referencias\conceitos-chave.md",
    "referencias\estilo-e-linguagem.md",
    "referencias\indice-aulas.md",
    "referencias\indice-aulas-completo.md",
    "referencias\indice-tematico.md",
    "referencias\metodologia.md"
)

if (-not (Test-Path -LiteralPath $skillRoot)) {
    throw "Pasta da skill nao encontrada em $skillRoot"
}

$missing = @()
foreach ($relativePath in $requiredFiles) {
    $fullPath = Join-Path $skillRoot $relativePath
    if (-not (Test-Path -LiteralPath $fullPath)) {
        $missing += $relativePath
    }
}

if ($missing.Count -gt 0) {
    Write-Host "Arquivos obrigatorios ausentes:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

$markdownCount = (Get-ChildItem -LiteralPath $skillRoot -Recurse -File -Filter *.md).Count
$htmlCount = (Get-ChildItem -LiteralPath $skillRoot -Recurse -File -Filter *.html).Count

Write-Host "Validacao concluida com sucesso." -ForegroundColor Green
Write-Host "Resumo:"
Write-Host "  Skill: $skillRoot"
Write-Host "  Markdown: $markdownCount"
Write-Host "  HTML: $htmlCount"
