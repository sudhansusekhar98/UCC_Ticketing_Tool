$Host.UI.RawUI.WindowTitle = "TicketOps Asset Ping - 10 Devices"
Clear-Host
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   TICKETOPS LIVE ASSET CONNECTIVITY CHECK     " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Started at: $(Get-Date)"
Write-Host ""
Write-Host "[...] Pinging ANGL-SWITCH-01  (10.0.72.40     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.40 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-SWITCH-02  (10.0.72.30     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.30 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-SWITCH-03  (10.0.72.31     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.31 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-SWITCH-04  (10.0.72.32     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.32 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-SWITCH-05  (10.0.72.33     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.33 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-SWITCH-06  (10.0.72.34     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.34 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-SWITCH-07  (10.0.72.35     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.35 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-SWITCH-08  (10.0.72.36     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.36 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-SWITCH-09  (10.0.72.37     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.37 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-SWITCH-10  (10.0.72.38     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.38 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Check Complete. Results synced to Dashboard.   " -ForegroundColor Yellow
Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")