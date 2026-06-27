# Stop any dev server on port 5173 (and orphaned vite node processes).
$ErrorActionPreference = 'SilentlyContinue'
$port = 5173

foreach ($line in (netstat -ano | Select-String "LISTENING" | Select-String ":$port\s")) {
  $procId = ($line.ToString().Trim() -split '\s+')[-1]
  if ($procId -match '^\d+$') {
    taskkill /F /PID $procId 2>$null
  }
}

Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'vite' } |
  ForEach-Object { taskkill /F /PID $_.ProcessId 2>$null }

Start-Sleep -Seconds 1

# Report remaining listeners (empty = success)
$left = netstat -ano | Select-String "LISTENING" | Select-String ":$port\s"
if ($left) { Write-Host "WARN: port $port still in use: $left" }
else { Write-Host "OK: port $port free" }
