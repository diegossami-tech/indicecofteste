param(
    [Parameter(Mandatory = $true)]
    [string]$Pattern,

    [int]$Before = 2,
    [int]$After = 6,
    [int]$MaxResults = 5
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_shared.ps1")

$corpusPath = Resolve-CorpusPath

if (-not (Test-Path -LiteralPath $corpusPath)) {
    throw "Corpus nao encontrado em $corpusPath"
}

$matches = Select-String -LiteralPath $corpusPath -Pattern $Pattern -Encoding UTF8 -Context $Before, $After

if (-not $matches) {
    Write-Host "Nenhum resultado encontrado para: $Pattern" -ForegroundColor Yellow
    exit 0
}

$matches | Select-Object -First $MaxResults | ForEach-Object {
    Write-Host ("=" * 80)
    Write-Host "Linha: $($_.LineNumber)"
    Write-Host "Trecho:"

    foreach ($line in $_.Context.PreContext) {
        Write-Host "  $line"
    }

    Write-Host "  $($_.Line)"

    foreach ($line in $_.Context.PostContext) {
        Write-Host "  $line"
    }

    Write-Host ""
}
