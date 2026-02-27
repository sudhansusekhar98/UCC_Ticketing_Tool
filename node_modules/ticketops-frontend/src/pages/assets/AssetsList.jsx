import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Monitor,
    Edit,
    Trash2,
    Camera,
    HardDrive,
    Network,
    Download,
    Upload,
    FileSpreadsheet,
    X,
    CheckCircle,
    AlertCircle,
    Eye,
    RotateCcw,
    Activity,
} from 'lucide-react';
import { assetsApi, sitesApi, lookupsApi } from '../../services/api';
import socketService from '../../services/socket';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';
import '../sites/Sites.css';
import './AssetsBulk.css';

const getAssetIcon = (type) => {
    switch (type) {
        case 'Camera': return <Camera size={14} />;
        case 'NVR': return <HardDrive size={14} />;
        case 'Switch': return <Network size={14} />;
        default: return <Monitor size={14} />;
    }
};

/**
 * Generate a PowerShell .ps1 script for local LAN pinging.
 * The script pings each device locally and POSTs results back to the API.
 *
 * WHY .ps1 not .bat:
 *   Windows CMD has an 8191-character command-line limit.
 *   With 600+ devices, a base64-encoded -EncodedCommand would be ~50KB
 *   and silently fail. A .ps1 file has NO size limit.
 */
function generatePingScript(assets, apiUrl, token) {
    // Build asset list as a PowerShell array literal
    const assetLines = assets.map(a => {
        // Escape single quotes in asset codes
        const code = (a.assetCode || 'Unknown').replace(/'/g, "''");
        const ip = (a.ipAddress || '').replace(/'/g, "''");
        const id = a._id;
        return `  [pscustomobject]@{ Id='${id}'; Code='${code}'; Ip='${ip}' }`;
    }).join(",`n");

    return `#Requires -Version 3.0
# =====================================================
# TicketOps Asset Ping Check Script
# Generated : ${new Date().toISOString().slice(0, 19)}
# Devices   : ${assets.length}
# =====================================================
# HOW TO RUN:
#   Right-click this file → "Run with PowerShell"
#   If you see an execution policy error, run:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
# =====================================================

$Host.UI.RawUI.WindowTitle = "TicketOps Ping Check - ${assets.length} Devices"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Clear-Host
Write-Host ""
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host "     TICKETOPS LOCAL ASSET CONNECTIVITY CHECK      " -ForegroundColor Cyan
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host ("  Started : " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Write-Host "  Devices : ${assets.length}"
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host ""

$API_URL = '${apiUrl}'
$TOKEN   = '${token}'
$HEADERS = @{
    'Authorization' = "Bearer $TOKEN"
    'Content-Type'  = 'application/json'
}

# Ignore SSL errors (self-signed certs)
try {
    add-type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAll : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint sp, X509Certificate cert, WebRequest req, int err) { return true; }
}
"@
    [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAll
} catch {}
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

$ASSETS = @(
${assetLines}
)

$batch   = [System.Collections.Generic.List[object]]::new()
$online  = 0
$offline = 0
$passive = 0
$total   = $ASSETS.Count
$count   = 0

function Send-Batch {
    param($b)
    try {
        $body = (@{ results = $b.ToArray() } | ConvertTo-Json -Depth 3 -Compress)
        Invoke-RestMethod -Uri "$API_URL/assets/bulk-status-update" \`
            -Method POST -Headers $HEADERS -Body $body \`
            -ContentType 'application/json' -ErrorAction Stop | Out-Null
        Write-Host ("    -> Synced " + $b.Count + " results to cloud") -ForegroundColor DarkYellow
    } catch {
        Write-Host ("    -> Sync error: " + $_.Exception.Message) -ForegroundColor DarkRed
    }
    $b.Clear()
}

foreach ($asset in $ASSETS) {
    $count++

    if (-not $asset.Ip -or $asset.Ip -eq '') {
        $status = 'Passive Device'
        $passive++
        Write-Host ("  [{0}/{1}] {2,-18} | " -f $count, $total, $asset.Code) -NoNewline
        Write-Host "PASSIVE " -ForegroundColor DarkGray -NoNewline
        Write-Host "(No IP)" -ForegroundColor Gray
    } else {
        Write-Host ("  [{0}/{1}] {2,-18} | {3,-16} | " -f $count, $total, $asset.Code, $asset.Ip) -NoNewline
        $isOnline = Test-Connection -ComputerName $asset.Ip -Count 1 -Quiet -ErrorAction SilentlyContinue
        if ($isOnline) {
            $status = 'Online'
            $online++
            Write-Host "ONLINE" -ForegroundColor Green
        } else {
            $status = 'Offline'
            $offline++
            Write-Host "OFFLINE" -ForegroundColor Red
        }
    }

    $batch.Add(@{ id = $asset.Id; status = $status })

    # Sync every 25 results
    if ($batch.Count -ge 25) { Send-Batch $batch }
}

# Flush remaining
if ($batch.Count -gt 0) { Send-Batch $batch }

Write-Host ""
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host "  ALL DONE" -ForegroundColor Green
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host ("  Online  : " + $online)  -ForegroundColor Green
Write-Host ("  Offline : " + $offline) -ForegroundColor Red
Write-Host ("  Passive : " + $passive) -ForegroundColor Gray
Write-Host ("  Total   : " + $total)
Write-Host "  =================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Results synced to TicketOps dashboard." -ForegroundColor Yellow
Write-Host "  Press any key to close..." -ForegroundColor Gray
Write-Host ""
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
`;
}


export default function AssetsList() {
    const [assets, setAssets] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
    const [siteFilter, setSiteFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [deviceFilter, setDeviceFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sites, setSites] = useState([]);
    const [locations, setLocations] = useState([]);
    const [locationFilter, setLocationFilter] = useState('');
    const [assetTypes, setAssetTypes] = useState([]);
    const [deviceTypes, setDeviceTypes] = useState([]);
    const [assetStatuses, setAssetStatuses] = useState([]);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const [statusCounts, setStatusCounts] = useState({ online: 0, offline: 0, passive: 0 });
    const navigate = useNavigate();
    const { hasRole, hasRight, hasRightForAnySite, refreshUserRights } = useAuthStore();

    // Bulk import/export state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [showPingModal, setShowPingModal] = useState(false);
    const [pingProgress, setPingProgress] = useState([]);
    const [pingStats, setPingStats] = useState({ total: 0, processed: 0, online: 0, offline: 0, passive: 0 });
    const fileInputRef = useRef(null);



    // Permission flags - recalculated when component re-renders after refreshUserRights
    const canCreate = hasRole(['Admin', 'Supervisor']) || hasRightForAnySite('MANAGE_ASSETS');
    const canBulkOps = hasRole(['Admin', 'Supervisor']) || hasRightForAnySite('MANAGE_ASSETS');
    const showActionColumn = hasRole(['Admin', 'Supervisor']) || hasRightForAnySite('MANAGE_ASSETS');

    // Refresh user rights when page loads to get latest permissions
    useEffect(() => {
        refreshUserRights();
    }, []);

    useEffect(() => {
        loadDropdowns();
    }, []);

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchValue(searchTerm);
            setPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Socket.IO Listeners for Ping Progress (only when sockets are available)
    useEffect(() => {
        const socket = socketService.connect();
        if (!socket) return; // sockets disabled - HTTP polling will be used instead

        const joinRoom = () => {
            const { user } = useAuthStore.getState();
            if (user?.userId) {
                console.log('[AssetsList] Socket connected, joining user room:', user.userId);
                socketService.joinUserRoom(user.userId);
            }
        };

        // Join immediately if already connected
        if (socket.connected) {
            joinRoom();
        }

        // Also join on every connect (includes reconnection)
        socketService.on('connect', joinRoom);

        socketService.on('asset:ping:start', (data) => {
            console.log('[AssetsList] Received ping:start', data);
            setPingProgress([]);
            setPingStats({ total: data.total, processed: 0, online: 0, offline: 0, passive: 0 });
            setShowPingModal(true);
            setCheckingStatus(true);
        });

        socketService.on('asset:ping:progress', (data) => {
            setPingProgress(prev => [data, ...prev].slice(0, 50)); // Keep last 50
            setPingStats(prev => ({
                ...prev,
                processed: data.processed,
                online: data.stats.online,
                offline: data.stats.offline,
                passive: data.stats.passive
            }));
        });

        socketService.on('asset:ping:complete', (data) => {
            console.log('[AssetsList] Received ping:complete', data);
            setCheckingStatus(false);
            fetchAssets(); // Refresh the list
            toast.success(`Ping check completed: ${data.online} Online, ${data.offline} Offline`);
        });

        return () => {
            socketService.off('connect', joinRoom);
            socketService.off('asset:ping:start');
            socketService.off('asset:ping:progress');
            socketService.off('asset:ping:complete');
        };
    }, []);

    // HTTP Polling fallback for ping progress (when WebSockets are unavailable)
    const pingPollRef = useRef(null);

    useEffect(() => {
        // Only poll when checkingStatus is true AND sockets are disabled
        if (!checkingStatus || socketService.isSocketEnabled()) {
            if (pingPollRef.current) {
                clearInterval(pingPollRef.current);
                pingPollRef.current = null;
            }
            return;
        }

        // Start polling
        const poll = async () => {
            try {
                const response = await assetsApi.getPingProgress();
                const data = response.data?.data;
                if (!data || data.status === 'idle') return;

                // Update stats
                if (data.stats) {
                    setPingStats({
                        total: data.stats.total,
                        processed: data.stats.processed,
                        online: data.stats.online,
                        offline: data.stats.offline,
                        passive: data.stats.passive
                    });
                }

                // Update log
                if (data.log && data.log.length > 0) {
                    setPingProgress(data.log.slice(0, 50));
                }

                // Check if check is complete
                if (data.status === 'complete') {
                    setCheckingStatus(false);
                    fetchAssets();
                    toast.success(`Ping check completed: ${data.stats.online} Online, ${data.stats.offline} Offline`);
                    // Clean up on server
                    assetsApi.clearPingProgress().catch(() => { });
                    if (pingPollRef.current) {
                        clearInterval(pingPollRef.current);
                        pingPollRef.current = null;
                    }
                }
            } catch (err) {
                console.error('[PingPoll] Error polling progress:', err);
            }
        };

        // Poll immediately, then every 2 seconds
        poll();
        pingPollRef.current = setInterval(poll, 2000);

        return () => {
            if (pingPollRef.current) {
                clearInterval(pingPollRef.current);
                pingPollRef.current = null;
            }
        };
    }, [checkingStatus]);

    // Fetch assets when filters or page change
    useEffect(() => {
        fetchAssets();
    }, [page, debouncedSearchValue, siteFilter, locationFilter, typeFilter, deviceFilter, statusFilter]);

    // Reset dependent filters and load locations when site changes
    useEffect(() => {
        if (siteFilter) {
            loadLocations(siteFilter);
            loadAssetTypes(siteFilter, '');
        } else {
            setLocations([]);
            setAssetTypes([]);
            setDeviceTypes([]);
        }
        setLocationFilter('');
        setTypeFilter('');
        setDeviceFilter('');
    }, [siteFilter]);

    // Load asset types based on location selection (only when location changes, not initial)
    useEffect(() => {
        if (siteFilter && locationFilter) {
            loadAssetTypes(siteFilter, locationFilter);
            setTypeFilter('');
            setDeviceFilter('');
        }
    }, [locationFilter]);

    // Load device types when asset type changes
    useEffect(() => {
        if (siteFilter && typeFilter) {
            loadDeviceTypes(siteFilter, locationFilter, typeFilter);
        } else {
            setDeviceTypes([]);
        }
        setDeviceFilter('');
    }, [typeFilter]);

    const loadDropdowns = async () => {
        try {
            const [sitesRes, statusesRes] = await Promise.all([
                sitesApi.getDropdown(),
                lookupsApi.getAssetStatuses(),
            ]);
            // Handle Express response format
            const siteData = sitesRes.data.data || sitesRes.data || [];
            setSites(siteData.map(s => ({
                value: s._id || s.value || s.siteId,
                label: s.siteName || s.label
            })));

            const statusData = statusesRes.data.data || statusesRes.data || [];
            setAssetStatuses(statusData);
        } catch (error) {
            console.error('Failed to load dropdowns', error);
        }
    };

    const loadLocations = async (siteId) => {
        if (!siteId) {
            setLocations([]);
            return;
        }
        try {
            const response = await assetsApi.getLocationNames(siteId);
            if (response.data && response.data.success) {
                // Backend returns [{ label: 'Name', value: 'Name' }, ...]
                setLocations(response.data.data || []);
            }
        } catch (error) {
            console.error('Failed to load locations', error);
            setLocations([]);
        }
    };

    const loadAssetTypes = async (siteId, locationName) => {
        if (!siteId) {
            setAssetTypes([]);
            return;
        }
        try {
            const response = await assetsApi.getAssetTypesForSite(siteId, locationName);
            if (response.data && response.data.success) {
                setAssetTypes(response.data.data || []);
            }
        } catch (error) {
            console.error('Failed to load asset types', error);
            setAssetTypes([]);
        }
    };

    const loadDeviceTypes = async (siteId, locationName, assetType) => {
        if (!siteId || !assetType) {
            setDeviceTypes([]);
            return;
        }
        try {
            const response = await assetsApi.getDeviceTypesForSite(siteId, locationName, assetType);
            if (response.data && response.data.success) {
                setDeviceTypes(response.data.data || []);
            }
        } catch (error) {
            console.error('Failed to load device types', error);
            setDeviceTypes([]);
        }
    };

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const response = await assetsApi.getAll({
                page,
                limit: pageSize,
                search: debouncedSearchValue || undefined,
                siteId: siteFilter || undefined,
                locationName: locationFilter || undefined,
                assetType: typeFilter || undefined,
                deviceType: deviceFilter || undefined,
                status: statusFilter || undefined,
            });
            // Handle both Express and .NET response formats
            const assetData = response.data.data || response.data.items || response.data || [];
            const total = response.data.pagination?.total || response.data.totalCount || assetData.length;
            const counts = response.data.statusCounts || { online: 0, offline: 0, passive: 0 };

            // Map to expected format
            const mappedAssets = assetData.map(a => ({
                ...a,
                assetId: a._id || a.assetId,
                locationName: a.locationName || a.locationDescription,
                macAddress: a.mac || a.macAddress
            }));

            setAssets(mappedAssets);
            setTotalCount(total);
            setStatusCounts(counts);
        } catch (error) {
            toast.error('Failed to load assets');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Are you sure you want to delete asset "${name}"?`)) return;

        try {
            await assetsApi.delete(id);
            toast.success('Asset deleted successfully');
            fetchAssets();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete asset');
        }
    };

    // Bulk operations handlers
    const handleDownloadTemplate = async () => {
        try {
            const response = await assetsApi.downloadTemplate();
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'assets_import_template.xlsx';
            document.body.appendChild(a);
            a.click();

            // Clean up
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

            toast.success('Template downloaded successfully');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download template');
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await assetsApi.exportAssets({
                search: searchTerm || undefined,
                siteId: siteFilter || undefined,
                assetType: typeFilter || undefined,
                status: statusFilter || undefined,
            });
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `assets_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();

            // Clean up
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

            toast.success('Assets exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export assets');
        } finally {
            setExporting(false);
        }
    };

    const handleImportClick = () => {
        setShowImportModal(true);
        setImportFile(null);
        setImportResult(null);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const isValidExtension = file.name.endsWith('.csv') || file.name.endsWith('.xlsx');
            if (!isValidExtension) {
                toast.error('Please select a CSV or XLSX file');
                return;
            }
            setImportFile(file);
            setImportResult(null);
        }
    };

    const handleImport = async () => {
        if (!importFile) {
            toast.error('Please select a file to import');
            return;
        }

        setImporting(true);
        setImportResult(null);

        try {
            const response = await assetsApi.bulkImport(importFile);
            setImportResult(response.data);
            if (response.data.success) {
                toast.success(response.data.message);
                // Refresh both assets and filter dropdowns to include new values from imported data
                fetchAssets();
                loadDropdowns();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            const errorData = error.response?.data;
            if (errorData?.data) {
                setImportResult(errorData);
            }
            const backendError = errorData?.error;
            const message = errorData?.message || 'Import failed';
            toast.error(backendError ? `${message}: ${backendError}` : message);
        } finally {
            setImporting(false);
        }
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCheckStatus = async () => {
        if (!window.confirm('Run IP status check for current filters?\n\nThis will download a PowerShell script that pings devices from your local network and syncs results to the dashboard.')) return;

        setPingProgress([]);
        setPingStats({ total: 0, processed: 0, online: 0, offline: 0, passive: 0 });
        setShowPingModal(true);
        setCheckingStatus(true);

        try {
            // 1. Fetch assets with decrypted IPs from the API
            const response = await assetsApi.checkStatus({
                search: debouncedSearchValue || undefined,
                siteId: siteFilter || undefined,
                locationName: locationFilter || undefined,
                assetType: typeFilter || undefined,
                status: statusFilter || undefined,
            });

            const assets = response.data?.data || [];
            if (!assets.length) {
                toast.info('No assets found for the selected filters.');
                setCheckingStatus(false);
                return;
            }

            // 2. Get the auth token and API URL
            const token = localStorage.getItem('accessToken');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            // 3. Generate PowerShell .ps1 script
            const psContent = generatePingScript(assets, apiUrl, token);

            // 4. Auto-download the .ps1 file
            const blob = new Blob([psContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `TicketOps_PingCheck_${new Date().toISOString().slice(0, 10)}.ps1`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

            // Set total for the modal display
            setPingStats(prev => ({ ...prev, total: assets.length }));

            toast.success(
                `Script downloaded! Right-click the .ps1 file → "Run with PowerShell" to start pinging ${assets.length} devices.`,
                { duration: 10000 }
            );

            // 5. Start polling for results (the script will POST results to the API)
            startPingResultPolling(assets.length);

        } catch (error) {
            toast.error('Failed to run status check');
            setCheckingStatus(false);
        }
    };

    // Poll the asset list to track status changes made by the script
    const pingPollTimerRef = useRef(null);

    const startPingResultPolling = (expectedTotal) => {
        // Clear any existing poll
        if (pingPollTimerRef.current) clearInterval(pingPollTimerRef.current);

        let lastProcessed = 0;
        let staleCount = 0;

        pingPollTimerRef.current = setInterval(async () => {
            try {
                const response = await assetsApi.getAll({
                    page: 1,
                    limit: 1,
                    search: debouncedSearchValue || undefined,
                    siteId: siteFilter || undefined,
                    locationName: locationFilter || undefined,
                    assetType: typeFilter || undefined,
                });
                const counts = response.data.statusCounts || { online: 0, offline: 0, passive: 0 };
                const currentProcessed = counts.online + counts.offline + counts.passive;

                setPingStats({
                    total: expectedTotal,
                    processed: currentProcessed,
                    online: counts.online,
                    offline: counts.offline,
                    passive: counts.passive,
                });

                // Check if processing seems complete (no new updates for 15 seconds)
                if (currentProcessed === lastProcessed) {
                    staleCount++;
                } else {
                    staleCount = 0;
                    lastProcessed = currentProcessed;
                }

                // Stop polling after 5 stale intervals (15s) or if we seem done
                if (staleCount >= 5) {
                    clearInterval(pingPollTimerRef.current);
                    pingPollTimerRef.current = null;
                    setCheckingStatus(false);
                    fetchAssets();
                    toast.success(`Status check sync complete: ${counts.online} Online, ${counts.offline} Offline`);
                }
            } catch (err) {
                console.error('[PingPoll] Error:', err);
            }
        }, 3000);
    };

    // Cleanup poll on unmount
    useEffect(() => {
        return () => {
            if (pingPollTimerRef.current) clearInterval(pingPollTimerRef.current);
        };
    }, []);

    const handleExportStatusReport = async () => {
        setExporting(true);
        try {
            const response = await assetsApi.exportStatusReport({
                search: searchTerm || undefined,
                siteId: siteFilter || undefined,
                locationName: locationFilter || undefined,
                assetType: typeFilter || undefined,
                status: statusFilter || undefined,
            });
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `asset_status_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Status report exported successfully');
        } catch (error) {
            toast.error('Failed to export status report');
        } finally {
            setExporting(false);
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Operational': return 'operational';
            case 'Degraded': return 'degraded';
            case 'Offline': return 'offline';
            case 'Maintenance': return 'maintenance';
            case 'Online': return 'operational';
            case 'Passive Device': return 'passive';
            default: return '';
        }
    };

    const renderCriticality = (level) => {
        return (
            <div className="criticality">
                {[1, 2, 3].map(i => (
                    <span key={i} className={`criticality-dot ${i <= level ? 'filled' : ''}`}></span>
                ))}
            </div>
        );
    };

    const totalPages = Math.ceil(totalCount / pageSize);



    return (
        <div className="page-container animate-fade-in assets-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Assets &nbsp;</h1>
                    <p className="page-subtitle">
                        {totalCount} total assets
                    </p>
                </div>

                {/* Status Counts */}
                <div className="status-stats-bar">
                    <div
                        className={`status-stat-card online ${statusFilter === 'Online' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter(statusFilter === 'Online' ? '' : 'Online'); setPage(1); }}
                        title="Filter by Online"
                    >
                        <div className="stat-icon"><CheckCircle size={18} /></div>
                        <span className="stat-value">{statusCounts.online}</span>
                        <span className="stat-label">Online</span>
                    </div>
                    <div
                        className={`status-stat-card offline ${statusFilter === 'Offline' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter(statusFilter === 'Offline' ? '' : 'Offline'); setPage(1); }}
                        title="Filter by Offline"
                    >
                        <div className="stat-icon"><AlertCircle size={18} /></div>
                        <span className="stat-value">{statusCounts.offline}</span>
                        <span className="stat-label">Offline</span>
                    </div>
                    <div
                        className={`status-stat-card passive ${statusFilter === 'Passive' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter(statusFilter === 'Passive' ? '' : 'Passive'); setPage(1); }}
                        title="Filter by Passive"
                    >
                        <div className="stat-icon"><Monitor size={18} /></div>
                        <span className="stat-value">{statusCounts.passive}</span>
                        <span className="stat-label">Passive</span>
                    </div>
                </div>


                <div className="header-actions">
                    <Link to="/assets/rma-records" className="btn btn-warning" title="View RMA Records">
                        <RotateCcw size={18} />
                        RMA Records
                    </Link>
                    {canBulkOps && (
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={handleDownloadTemplate}
                                title="Download Import Template"
                            >
                                <FileSpreadsheet size={18} />
                                Template
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleImportClick}
                                title="Bulk Import Assets"
                            >
                                <Upload size={18} />
                                Import
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={handleCheckStatus}
                                disabled={checkingStatus}
                                title="Run IP Ping Check"
                            >
                                <Activity size={18} className={checkingStatus ? 'spin' : ''} />
                                {checkingStatus ? 'Checking...' : 'Check Status'}
                            </button>
                        </>
                    )}
                    <button
                        className="btn btn-secondary"
                        onClick={handleExportStatusReport}
                        disabled={exporting}
                        title="Export Status Report"
                    >
                        <Download size={18} />
                        Status Report
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleExport}
                        disabled={exporting}
                        title="Export Assets to CSV"
                    >
                        <Download size={18} />
                        {exporting ? 'Exporting...' : 'Export'}
                    </button>
                    {canCreate && (
                        <Link to="/assets/new" className="btn btn-primary">
                            <Plus size={18} />
                            Add Asset
                        </Link>
                    )}
                </div>
            </div>



            {/* Filters */}
            <div className="filter-bar glass-card compact">
                <div className="filter-bar-content">
                    <div className="search-box small">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filters-inline">
                        <select
                            className="filter-select"
                            value={siteFilter}
                            onChange={(e) => { setSiteFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Sites</option>
                            {sites.map(site => (
                                <option key={site.value} value={site.value}>{site.label}</option>
                            ))}
                        </select>
                        {/* Location dropdown - only show when site is selected and locations exist */}
                        {siteFilter && locations.length > 0 && (
                            <select
                                className="filter-select"
                                value={locationFilter}
                                onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
                                title="Filter by location"
                            >
                                <option value="">All Locations</option>
                                {locations.map(loc => (
                                    <option key={loc.value} value={loc.value}>{loc.label}</option>
                                ))}
                            </select>
                        )}
                        {/* Asset Type dropdown - only show when site is selected and asset types exist */}
                        {siteFilter && assetTypes.length > 0 && (
                            <select
                                className="filter-select"
                                value={typeFilter}
                                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">All Types</option>
                                {assetTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        )}
                        {/* Device Type dropdown - only show when asset type is selected and device types exist */}
                        {siteFilter && typeFilter && deviceTypes.length > 0 && (
                            <select
                                className="filter-select"
                                value={deviceFilter}
                                onChange={(e) => { setDeviceFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">All Devices</option>
                                {deviceTypes.map(device => (
                                    <option key={device.value} value={device.value}>{device.label}</option>
                                ))}
                            </select>
                        )}
                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        >
                            <option value="">All Status</option>
                            {assetStatuses.map(status => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-actions-inline">
                        <button className="btn btn-secondary icon-btn-small" onClick={fetchAssets} title="Refresh">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                    </div>
                ) : assets.length === 0 ? (
                    <div className="empty-state">
                        <Monitor size={48} />
                        <p>No assets found</p>
                    </div>
                ) : (
                    <>
                        <table className="data-table compact assets-table">
                            <thead>
                                <tr>
                                    <th className="col-sl">Sl No.</th>
                                    <th className="col-code">Asset Code</th>
                                    <th className="col-ip">IP Address</th>
                                    <th className="col-status">Status</th>
                                    <th className="col-site">Site Name</th>
                                    <th className="col-location">Location Name</th>
                                    <th className="col-type">Asset Type</th>
                                    <th className="col-device">Device</th>
                                    <th className="col-mac">Mac Address</th>
                                    <th className="col-serial">SL Number</th>
                                    {showActionColumn && <th className="col-actions">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((asset, index) => (
                                    <tr key={asset.assetId}>
                                        <td className="col-sl">{(page - 1) * pageSize + index + 1}</td>
                                        <td title={asset.assetCode || ''}>
                                            <Link to={`/assets/${asset.assetId}`} className="text-primary font-mono hover:underline">
                                                {asset.assetCode || '—'}
                                            </Link>
                                        </td>
                                        <td title={asset.ipAddress || asset.managementIP || ''}>
                                            <span className="font-mono">
                                                {asset.ipAddress || asset.managementIP || '—'}
                                            </span>
                                        </td>
                                        <td className="col-status">
                                            <span className={`status-badge ${getStatusClass(asset.status)}`}>
                                                {asset.status || 'Operational'}
                                            </span>
                                        </td>
                                        <td title={asset.siteId?.siteName || ''}>{asset.siteId?.siteName || '—'}</td>
                                        <td title={asset.locationName || asset.locationDescription || ''}>{asset.locationName || asset.locationDescription || '—'}</td>
                                        <td title={asset.assetType || ''}>{asset.assetType || '—'}</td>
                                        <td title={asset.deviceType || ''}>{asset.deviceType || '—'}</td>
                                        <td title={asset.mac || asset.macAddress || ''}>{asset.mac || asset.macAddress || '—'}</td>
                                        <td title={asset.serialNumber || ''}>
                                            <span className="font-mono">{asset.serialNumber || '—'}</span>
                                        </td>
                                        {showActionColumn && (
                                            <td className="col-actions">
                                                <div className="action-buttons">
                                                    <Link to={`/assets/${asset.assetId}`} className="btn btn-icon btn-ghost" title="View Details">
                                                        <Eye size={14} />
                                                    </Link>
                                                    {(hasRole(['Admin', 'Supervisor']) || hasRight('MANAGE_ASSETS', asset.siteId?._id || asset.siteId)) && (
                                                        <>
                                                            <Link to={`/assets/${asset.assetId}/edit`} className="btn btn-icon btn-ghost" title="Edit">
                                                                <Edit size={14} />
                                                            </Link>
                                                            <button
                                                                className="btn btn-icon btn-ghost text-danger"
                                                                onClick={() => handleDelete(asset.assetId, asset.assetCode)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft size={18} />
                                    Previous
                                </button>
                                <span className="page-info">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page === totalPages}
                                >
                                    Next
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Import Modal */}
            {
                showImportModal && createPortal(
                    <div className="modal-overlay" onClick={closeImportModal}>
                        <div className="modal glass-card w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>
                                    <Upload size={20} />
                                    Bulk Import Assets
                                </h3>
                                <button className="btn btn-ghost btn-icon" onClick={closeImportModal}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="modal-body">
                                <div className="import-instructions">
                                    <h4>Instructions:</h4>
                                    <ol>
                                        <li>Download the import template using the "Template" button</li>
                                        <li>Fill in the asset data in the CSV or Excel file</li>
                                        <li>Fields marked with * are required</li>
                                        <li>Upload the completed file below</li>
                                    </ol>
                                </div>

                                <div className="file-upload-area">
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx"
                                        onChange={handleFileChange}
                                        ref={fileInputRef}
                                        id="csv-file-input"
                                        className="file-input"
                                    />
                                    <label htmlFor="csv-file-input" className="file-upload-label">
                                        <FileSpreadsheet size={32} />
                                        <span>{importFile ? importFile.name : 'Click to select file'}</span>
                                        <small>.csv and .xlsx files are supported</small>
                                    </label>
                                </div>

                                {importResult && (
                                    <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
                                        <div className="result-header">
                                            {importResult.success ? (
                                                <CheckCircle size={20} className="success-icon" />
                                            ) : (
                                                <AlertCircle size={20} className="error-icon" />
                                            )}
                                            <span>{importResult.message}</span>
                                        </div>

                                        {importResult.data && (
                                            <div className="result-stats">
                                                <span className="stat success">
                                                    <CheckCircle size={14} />
                                                    {importResult.data.created || 0} created
                                                </span>
                                                <span className="stat info">
                                                    <RefreshCw size={14} />
                                                    {importResult.data.updated || 0} updated
                                                </span>
                                                <span className="stat error">
                                                    <AlertCircle size={14} />
                                                    {importResult.data.failed || 0} failed
                                                </span>
                                            </div>
                                        )}

                                        {importResult.data?.errors?.length > 0 && (
                                            <div className="error-list">
                                                <strong>Errors:</strong>
                                                <ul>
                                                    {importResult.data.errors.slice(0, 10).map((err, idx) => (
                                                        <li key={idx}>{err}</li>
                                                    ))}
                                                    {importResult.data.errors.length > 10 && (
                                                        <li className="more-errors">
                                                            ...and {importResult.data.errors.length - 10} more errors
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={closeImportModal}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleImport}
                                    disabled={!importFile || importing}
                                >
                                    {importing ? (
                                        <>
                                            <RefreshCw size={16} className="spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={16} />
                                            Import Assets
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {
                showPingModal && createPortal(
                    <PingProgressModal
                        stats={pingStats}
                        progress={pingProgress}
                        onClose={() => setShowPingModal(false)}
                        isChecking={checkingStatus}
                    />,
                    document.body
                )
            }
        </div >
    );
}

function PingProgressModal({ stats, progress, onClose, isChecking }) {
    const progressPercent = stats.total > 0 ? Math.round(((stats.online + stats.offline + stats.passive) / stats.total) * 100) : 0;

    return (
        <div className="modal-overlay" onClick={!isChecking ? onClose : undefined}>
            <div className="modal ping-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3><Activity size={20} className={isChecking ? 'spin' : ''} /> IP Ping Progress</h3>
                    <button className="btn-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body">
                    <div className="ping-stats-grid">
                        <div className="ping-stat-card">
                            <span className="label">Total</span>
                            <span className="value">{stats.total}</span>
                        </div>
                        <div className="ping-stat-card success">
                            <span className="label">Online</span>
                            <span className="value">{stats.online}</span>
                        </div>
                        <div className="ping-stat-card danger">
                            <span className="label">Offline</span>
                            <span className="value">{stats.offline}</span>
                        </div>
                        <div className="ping-stat-card passive">
                            <span className="label">Passive</span>
                            <span className="value">{stats.passive}</span>
                        </div>
                    </div>

                    {isChecking && (
                        <div style={{
                            background: 'var(--bg-secondary, #f0f4ff)',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginBottom: '16px',
                            border: '1px solid var(--border-color, #e0e7ff)',
                            fontSize: '13px',
                            lineHeight: '1.6'
                        }}>
                            <strong>📋 How to run the ping check:</strong>
                            <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                                <li>Open your <strong>Downloads</strong> folder</li>
                                <li><strong>Right-click</strong> the <code>TicketOps_PingCheck_*.ps1</code> file</li>
                                <li>Select <strong>"Run with PowerShell"</strong></li>
                                <li>A blue terminal opens — pinging starts automatically</li>
                                <li>Results sync here as batches complete (every 25 devices)</li>
                            </ol>
                        </div>
                    )}

                    <div className="progress-container">
                        <div className="progress-header">
                            <span>{isChecking ? 'Waiting for script results...' : 'Check completed'}</span>
                            <span>{progressPercent}%</span>
                        </div>
                        <div className="progress-bar-bg">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>

                    {progress.length > 0 && (
                        <div className="ping-log">
                            <h4>Activity Log</h4>
                            <div className="log-entries">
                                {progress.map((entry, idx) => (
                                    <div key={idx} className={`log-entry ${entry.status.toLowerCase().replace(' ', '-')}`}>
                                        <div className="log-entry-info">
                                            <span className="code">{entry.assetCode}</span>
                                            <span className="ip">{entry.ipAddress}</span>
                                        </div>
                                        <span className={`badge ${entry.status === 'Online' ? 'badge-success' : entry.status === 'Passive Device' ? 'badge-secondary' : 'badge-danger'}`}>
                                            {entry.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button
                        className="btn btn-primary"
                        onClick={onClose}
                    >
                        {isChecking ? 'Stop Waiting & Close' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}
