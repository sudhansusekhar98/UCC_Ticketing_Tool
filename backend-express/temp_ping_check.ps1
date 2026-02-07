$Host.UI.RawUI.WindowTitle = "TicketOps Asset Ping - 161 Devices"
Clear-Host
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   TICKETOPS LIVE ASSET CONNECTIVITY CHECK     " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Started at: $(Get-Date)"
Write-Host ""
Write-Host "[...] Pinging ANGL-ALPR-01    (10.0.72.100    )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.100 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-ALPR-02    (10.0.72.101    )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.101 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-ALPR-03    (10.0.72.102    )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.102 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-ALPR-04    (10.0.72.103    )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.103 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-ALPR-05    (10.0.72.104    )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.104 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-ALPR-06    (10.0.72.105    )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.105 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-01  (10.0.72.73     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.73 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-02  (10.0.72.74     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.74 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-03  (10.0.72.75     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.75 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-04  (10.0.72.76     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.76 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-05  (10.0.72.50     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.50 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-06  (10.0.72.51     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.51 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-07  (10.0.72.52     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.52 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-08  (10.0.72.53     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.53 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-09  (10.0.72.54     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.54 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-10  (10.0.72.55     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.55 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-11  (10.0.72.56     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.56 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-12  (10.0.72.63     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.63 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-13  (10.0.72.64     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.64 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-14  (10.0.72.65     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.65 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-15  (10.0.72.67     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.67 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-16  (10.0.72.58     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.58 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-17  (10.0.72.59     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.59 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-18  (10.0.72.60     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.60 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-19  (10.0.72.61     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.61 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-20  (10.0.72.78     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.78 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-21  (10.0.72.79     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.79 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-22  (10.0.72.80     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.80 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-23  (10.0.72.82     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.82 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-24  (10.0.72.83     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.83 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-25  (10.0.72.84     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.84 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-26  (10.0.72.85     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.85 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-27  (10.0.72.68     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.68 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-28  (10.0.72.69     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.69 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-29  (10.0.72.71     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.71 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-BULLET-30  (10.0.72.72     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.72 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-PTZ-01     (10.0.72.77     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.77 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-PTZ-02     (10.0.72.86     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.86 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-PTZ-03     (10.0.72.57     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.57 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-PTZ-04     (10.0.72.66     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.66 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-PTZ-05     (10.0.72.62     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.62 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-PTZ-06     (10.0.72.81     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.81 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-PTZ-07     (10.0.72.123    )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.123 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-PTZ-08     (10.0.72.70     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.70 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-CLIENT-SYSTEM-01 (10.0.72.4      )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.4 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-CLIENT-SYSTEM-02 (10.0.72.26     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.26 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-Server-01  (10.0.72.10     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.10 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-Server-02  (10.0.72.11     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.11 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
Write-Host "[...] Pinging ANGL-Server-03  (10.0.72.13     )... " -NoNewline; if (Test-Connection -ComputerName 10.0.72.13 -Count 1 -Quiet) { Write-Host "ONLINE" -ForegroundColor Green } else { Write-Host "OFFLINE" -ForegroundColor Red }
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
Write-Host "[-] ANGL-Online-UPS-01 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-Online-UPS-02 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-Online-UPS-03 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-Online-UPS-04 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-Online-UPS-05 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-Online-UPS-06 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-Online-UPS-07 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-Online-UPS-08 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-01   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PDU-01     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PDU-02     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PDU-03     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PDU-04     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PDU-05     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PDU-06     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PDU-07     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PDU-08     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PDU-09     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PDU-10     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MCB-01     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MCB-02     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MCB-03     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MCB-04     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MCB-05     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MCB-06     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MCB-07     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MCB-08     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MCB-09     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MCB-10     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-LIU-01     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-LIU-02     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-LIU-03     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-LIU-04     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-LIU-05     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-LIU-06     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-LIU-07     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-LIU-08     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-LIU-09     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-LIU-10     | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-02   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-03   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-04   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-05   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-06   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-07   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-08   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-09   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-10   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-11   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-12   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-13   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-14   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-15   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-16   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-17   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-18   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-19   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-20   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-21   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-22   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-23   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-24   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-25   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-CABLE-26   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-OFC        | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PoE-INJECTOR-01 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PoE-INJECTOR-02 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PoE-INJECTOR-03 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PoE-INJECTOR-04 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PoE-INJECTOR-05 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-PoE-INJECTOR-06 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MODULE-01  | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MODULE-02  | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MODULE-03  | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MODULE-04  | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MODULE-05  | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MODULE-06  | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MODULE-07  | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MODULE-08  | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MODULE-09  | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-MODULE-10  | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-IN-Rack-01 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-IN-Rack-02 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-OUT-Rack-01 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-OUT-Rack-02 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-OUT-Rack-03 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-OUT-Rack-04 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-OUT-Rack-05 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-OUT-Rack-06 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-OUT-Rack-07 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-OUT-Rack-08 | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-SC-LC-01   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-SC-LC-02   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-SC-LC-03   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-SC-LC-04   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-SC-LC-05   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-SC-LC-06   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-SC-LC-07   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-SC-LC-08   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-SC-LC-09   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-SC-LC-10   | Passive Device" -ForegroundColor Gray
Write-Host "[-] ANGL-UTP-Patch-Cord | Passive Device" -ForegroundColor Gray
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Check Complete. Results synced to Dashboard.   " -ForegroundColor Yellow
Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")