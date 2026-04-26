$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_shared.ps1")

function Parse-IndexValue {
    param(
        [string]$Value
    )

    $trimmed = $Value.Trim()
    if (-not $trimmed -or $trimmed -match '^[-—]+$') {
        return $null
    }

    return $trimmed
}

function Parse-AulaSpec {
    param(
        [string]$Spec
    )

    $trimmed = $Spec.Trim()
    $rangeMatch = [regex]::Match($trimmed, '^(\d+)\s*-\s*(\d+)$')

    if ($rangeMatch.Success) {
        $start = [int]$rangeMatch.Groups[1].Value
        $end = [int]$rangeMatch.Groups[2].Value
        return @($start..$end)
    }

    $single = 0
    if ([int]::TryParse($trimmed, [ref]$single)) {
        return @($single)
    }

    return @()
}

function Parse-MarkdownTableRow {
    param(
        [string]$Line
    )

    if (-not $Line.StartsWith("|")) {
        return $null
    }

    $cells = $Line.Split("|") | Select-Object -Skip 1 | Select-Object -SkipLast 1 | ForEach-Object {
        $_.Trim()
    }

    if ($cells.Count -lt 4) {
        return $null
    }

    return $cells
}

$projectRoot = Get-ProjectRoot
$corpusPath = Resolve-CorpusPath
$indexPath = Join-Path $projectRoot "skills\filosofia-olavo-cof\referencias\indice-aulas-completo.md"
$outputPath = Join-Path $projectRoot "docs\aulas-workbench.json"

if (-not (Test-Path -LiteralPath $indexPath)) {
    throw "Indice mestre nao encontrado em $indexPath"
}

$corpusLines = Get-Content -LiteralPath $corpusPath -Encoding UTF8
$indexLines = Get-Content -LiteralPath $indexPath -Encoding UTF8

$allAulas = @()
for ($number = 1; $number -le 585; $number++) {
    $allAulas += [pscustomobject]@{
        number = $number
        startLine = $null
        endLine = $null
        date = $null
        summary = $null
        source = "estimated"
    }
}

$exactAulaNumbers = New-Object System.Collections.Generic.List[int]

foreach ($line in $indexLines) {
    $cells = Parse-MarkdownTableRow -Line $line
    if ($null -eq $cells) {
        continue
    }

    $aulaNumbers = Parse-AulaSpec -Spec $cells[0]
    if ($aulaNumbers.Count -eq 0) {
        continue
    }

    $startLineValue = 0
    $hasStartLine = [int]::TryParse($cells[1], [ref]$startLineValue)
    $rawDate = Parse-IndexValue -Value $cells[2]
    $rawSummary = Parse-IndexValue -Value $cells[3]
    $dateLooksLikeNote = $false
    if ($rawDate) {
        $dateLooksLikeNote = $rawDate.StartsWith("[") -and $rawDate.EndsWith("]")
    }

    $date = if ($dateLooksLikeNote) { $null } else { $rawDate }
    $summary = if ($rawSummary) { $rawSummary } elseif ($dateLooksLikeNote) { $rawDate } else { $null }

    foreach ($aulaNumber in $aulaNumbers) {
        if ($aulaNumber -lt 1 -or $aulaNumber -gt 585) {
            continue
        }

        $aula = $allAulas[$aulaNumber - 1]
        $aula.date = $date
        $aula.summary = $summary

        if ($hasStartLine) {
            $aula.startLine = $startLineValue
            $aula.source = "exact"
            [void]$exactAulaNumbers.Add($aulaNumber)
        }
    }
}

$sortedExactAulas = $exactAulaNumbers | Sort-Object -Unique
for ($index = 0; $index -lt ($sortedExactAulas.Count - 1); $index++) {
    $previousNumber = $sortedExactAulas[$index]
    $nextNumber = $sortedExactAulas[$index + 1]
    $previousAula = $allAulas[$previousNumber - 1]
    $nextAula = $allAulas[$nextNumber - 1]
    $gapSize = $nextNumber - $previousNumber

    if ($gapSize -le 1) {
        continue
    }

    $lineDistance = $nextAula.startLine - $previousAula.startLine
    $step = $lineDistance / $gapSize

    for ($offset = 1; $offset -lt $gapSize; $offset++) {
        $aula = $allAulas[$previousNumber + $offset - 1]
        if ($null -ne $aula.startLine) {
            continue
        }

        $aula.startLine = [int][math]::Round($previousAula.startLine + ($step * $offset))
        $aula.source = "estimated"
    }
}

for ($index = 1; $index -lt $allAulas.Count; $index++) {
    $previousAula = $allAulas[$index - 1]
    $aula = $allAulas[$index]

    if ($null -eq $aula.startLine -and $null -ne $previousAula.startLine) {
        $aula.startLine = $previousAula.startLine + 1
    }

    if ($null -ne $aula.startLine -and $null -ne $previousAula.startLine -and $aula.startLine -le $previousAula.startLine) {
        $aula.startLine = $previousAula.startLine + 1
    }
}

for ($index = $allAulas.Count - 2; $index -ge 0; $index--) {
    $aula = $allAulas[$index]
    $nextAula = $allAulas[$index + 1]

    if ($null -eq $aula.startLine -and $null -ne $nextAula.startLine) {
        $aula.startLine = [math]::Max(1, $nextAula.startLine - 1)
    }

    if ($null -ne $aula.startLine -and $null -ne $nextAula.startLine -and $aula.startLine -ge $nextAula.startLine) {
        $aula.startLine = [math]::Max(1, $nextAula.startLine - 1)
    }
}

for ($index = 0; $index -lt $allAulas.Count; $index++) {
    $aula = $allAulas[$index]
    if ($index -lt ($allAulas.Count - 1)) {
        $aula.endLine = $allAulas[$index + 1].startLine - 1
    }
    else {
        $aula.endLine = $corpusLines.Count
    }
}

$workbench = foreach ($aula in $allAulas) {
    $previewItems = New-Object System.Collections.Generic.List[object]
    $startIndex = [math]::Max(0, $aula.startLine - 1)
    $endIndex = [math]::Min($corpusLines.Count - 1, $aula.endLine - 1)

    for ($lineIndex = $startIndex; $lineIndex -le $endIndex; $lineIndex++) {
        $text = [string]$corpusLines[$lineIndex]
        if ([string]::IsNullOrWhiteSpace($text)) {
            continue
        }

        [void]$previewItems.Add([pscustomobject]@{
            lineNumber = $lineIndex + 1
            text = $text.Trim()
        })

        if ($previewItems.Count -ge 10) {
            break
        }
    }

    [pscustomobject]@{
        aula = $aula.number
        date = $aula.date
        summary = $aula.summary
        startLine = $aula.startLine
        endLine = $aula.endLine
        source = $aula.source
        openingExcerpt = $previewItems
    }
}

$payload = [pscustomobject]@{
    generatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
    corpusPath = $corpusPath
    totalAulas = 585
    exactAulas = ($allAulas | Where-Object { $_.source -eq "exact" }).Count
    estimatedAulas = ($allAulas | Where-Object { $_.source -eq "estimated" }).Count
    items = $workbench
}

$payload | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $outputPath -Encoding UTF8

Write-Host "Workbench exportado para $outputPath"
Write-Host "Aulas: $($payload.totalAulas) | Exatas: $($payload.exactAulas) | Estimadas: $($payload.estimatedAulas)"
