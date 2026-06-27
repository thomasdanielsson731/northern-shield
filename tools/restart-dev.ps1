# Single entry: stop old Vite, start fresh (blocks — use in a terminal tab).
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
& "$PSScriptRoot\stop-dev.ps1"
Set-Location $root
npm run dev
