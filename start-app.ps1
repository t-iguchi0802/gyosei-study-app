$ErrorActionPreference = 'Stop'
$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue

if ($nodeCommand) {
    $nodeExe = $nodeCommand.Source
} elseif (Test-Path -LiteralPath $bundledNode) {
    $nodeExe = $bundledNode
} else {
    throw 'Node.jsが見つかりません。Codexから起動するか、Node.jsをインストールしてください。'
}

Set-Location -LiteralPath $appDir
& $nodeExe 'server.js'
