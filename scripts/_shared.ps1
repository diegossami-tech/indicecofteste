function Get-ProjectRoot {
    return Split-Path -Parent $PSScriptRoot
}

function Resolve-CorpusPath {
    $projectRoot = Get-ProjectRoot
    $localConfig = Join-Path $projectRoot "config\corpus.local.json"
    $exampleConfig = Join-Path $projectRoot "config\corpus.example.json"

    if (Test-Path -LiteralPath $localConfig) {
        $config = Get-Content -LiteralPath $localConfig -Raw | ConvertFrom-Json
        if ($config.corpusPath) {
            return [string]$config.corpusPath
        }
    }

    if ($env:COF_CORPUS_PATH) {
        return $env:COF_CORPUS_PATH
    }

    throw "Caminho do corpus nao configurado. Edite $localConfig, copie $exampleConfig ou defina COF_CORPUS_PATH."
}
