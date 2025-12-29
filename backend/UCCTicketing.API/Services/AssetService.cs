using Microsoft.EntityFrameworkCore;
using System.Text;
using UCCTicketing.API.Data;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Entities;

namespace UCCTicketing.API.Services;

public interface IAssetService
{
    Task<PagedResponse<AssetDto>> GetAssetsAsync(int page, int pageSize, int? siteId = null, string? assetType = null, string? status = null, bool? isActive = null, int userId = 0, string userRole = "");
    Task<AssetDto?> GetAssetByIdAsync(int assetId);
    Task<ApiResponse<AssetDto>> CreateAssetAsync(CreateAssetRequest request);
    Task<ApiResponse<AssetDto>> UpdateAssetAsync(int assetId, UpdateAssetRequest request);
    Task<ApiResponse<bool>> DeleteAssetAsync(int assetId);
    Task<List<DropdownOption>> GetAssetsDropdownAsync(int? siteId = null);
    Task<ApiResponse<bool>> UpdateAssetStatusAsync(int assetId, string status);
    
    // Bulk operations
    byte[] GenerateTemplate();
    Task<byte[]> ExportAssetsAsync(int? siteId = null, string? assetType = null, string? status = null);
    Task<ApiResponse<BulkImportResult>> BulkImportAsync(Stream fileStream, int createdByUserId);
}

public class AssetService : IAssetService
{
    private readonly UCCDbContext _context;
    private readonly ILogger<AssetService> _logger;

    public AssetService(UCCDbContext context, ILogger<AssetService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PagedResponse<AssetDto>> GetAssetsAsync(int page, int pageSize, int? siteId = null, string? assetType = null, string? status = null, bool? isActive = null, int userId = 0, string userRole = "")
    {
        var query = _context.Assets
            .Include(a => a.Site)
            .Include(a => a.Tickets.Where(t => TicketStatuses.ActiveStatuses.Contains(t.Status)))
            .AsQueryable();

        // Filter by user's site if not admin
        if (!string.IsNullOrEmpty(userRole) && userRole != UserRoles.Admin && userId > 0)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user?.SiteId != null)
            {
                query = query.Where(a => a.SiteId == user.SiteId.Value);
            }
        }
        else if (siteId.HasValue)
        {
            query = query.Where(a => a.SiteId == siteId.Value);
        }

        if (!string.IsNullOrEmpty(assetType))
            query = query.Where(a => a.AssetType == assetType);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(a => a.Status == status);

        if (isActive.HasValue)
            query = query.Where(a => a.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();

        var assets = await query
            .OrderBy(a => a.AssetCode)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AssetDto
            {
                AssetId = a.AssetId,
                AssetCode = a.AssetCode,
                AssetType = a.AssetType,
                Make = a.Make,
                Model = a.Model,
                SerialNumber = a.SerialNumber,
                ManagementIP = a.ManagementIP,
                MAC = a.MAC,
                SiteId = a.SiteId,
                SiteName = a.Site.SiteName,
                LocationDescription = a.LocationDescription,
                LocationName = a.LocationName,
                DeviceType = a.DeviceType,
                UsedFor = a.UsedFor,
                Criticality = a.Criticality,
                CriticalityLabel = a.Criticality == 1 ? "Low" : a.Criticality == 2 ? "Medium" : "High",
                Status = a.Status,
                InstallationDate = a.InstallationDate,
                WarrantyEndDate = a.WarrantyEndDate,
                VmsReferenceId = a.VmsReferenceId,
                NmsReferenceId = a.NmsReferenceId,
                UserName = a.UserName,
                Remark = a.Remark,
                IsActive = a.IsActive,
                CreatedOn = a.CreatedOn,
                OpenTicketCount = a.Tickets.Count
            })
            .ToListAsync();

        return new PagedResponse<AssetDto>
        {
            Items = assets,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<AssetDto?> GetAssetByIdAsync(int assetId)
    {
        return await _context.Assets
            .Include(a => a.Site)
            .Include(a => a.Tickets.Where(t => TicketStatuses.ActiveStatuses.Contains(t.Status)))
            .Where(a => a.AssetId == assetId)
            .Select(a => new AssetDto
            {
                AssetId = a.AssetId,
                AssetCode = a.AssetCode,
                AssetType = a.AssetType,
                Make = a.Make,
                Model = a.Model,
                SerialNumber = a.SerialNumber,
                ManagementIP = a.ManagementIP,
                MAC = a.MAC,
                SiteId = a.SiteId,
                SiteName = a.Site.SiteName,
                LocationDescription = a.LocationDescription,
                LocationName = a.LocationName,
                DeviceType = a.DeviceType,
                UsedFor = a.UsedFor,
                Criticality = a.Criticality,
                CriticalityLabel = a.Criticality == 1 ? "Low" : a.Criticality == 2 ? "Medium" : "High",
                Status = a.Status,
                InstallationDate = a.InstallationDate,
                WarrantyEndDate = a.WarrantyEndDate,
                VmsReferenceId = a.VmsReferenceId,
                NmsReferenceId = a.NmsReferenceId,
                UserName = a.UserName,
                Remark = a.Remark,
                IsActive = a.IsActive,
                CreatedOn = a.CreatedOn,
                OpenTicketCount = a.Tickets.Count
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ApiResponse<AssetDto>> CreateAssetAsync(CreateAssetRequest request)
    {
        try
        {
            // Check if asset code exists
            if (await _context.Assets.AnyAsync(a => a.AssetCode == request.AssetCode))
            {
                return ApiResponse<AssetDto>.FailResponse("Asset code already exists");
            }

            // Validate asset type
            if (!AssetTypes.AllTypes.Contains(request.AssetType))
            {
                return ApiResponse<AssetDto>.FailResponse("Invalid asset type");
            }

            // Validate site exists
            if (!await _context.Sites.AnyAsync(s => s.SiteId == request.SiteId))
            {
                return ApiResponse<AssetDto>.FailResponse("Site not found");
            }

            var asset = new AssetMaster
            {
                AssetCode = request.AssetCode,
                AssetType = request.AssetType,

                Make = request.Make,
                Model = request.Model,

                SerialNumber = request.SerialNumber,
                ManagementIP = request.ManagementIP,
                MAC = request.MAC,
                SiteId = request.SiteId,
                LocationDescription = request.LocationDescription,
                LocationName = request.LocationName,
                DeviceType = request.DeviceType,
                UsedFor = request.UsedFor,
                Criticality = request.Criticality,
                Status = request.Status,
                InstallationDate = request.InstallationDate,
                WarrantyEndDate = request.WarrantyEndDate,
                VmsReferenceId = request.VmsReferenceId,
                NmsReferenceId = request.NmsReferenceId,
                UserName = request.UserName,
                Password = request.Password,
                Remark = request.Remark,
                IsActive = true,
                CreatedOn = DateTime.UtcNow
            };

            _context.Assets.Add(asset);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Asset {AssetCode} created successfully", asset.AssetCode);

            var dto = await GetAssetByIdAsync(asset.AssetId);
            return ApiResponse<AssetDto>.SuccessResponse(dto!, "Asset created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating asset");
            return ApiResponse<AssetDto>.FailResponse("An error occurred while creating asset");
        }
    }

    public async Task<ApiResponse<AssetDto>> UpdateAssetAsync(int assetId, UpdateAssetRequest request)
    {
        try
        {
            var asset = await _context.Assets.FindAsync(assetId);
            if (asset == null)
            {
                return ApiResponse<AssetDto>.FailResponse("Asset not found");
            }

            // Check if asset code is taken by another asset
            if (await _context.Assets.AnyAsync(a => a.AssetCode == request.AssetCode && a.AssetId != assetId))
            {
                return ApiResponse<AssetDto>.FailResponse("Asset code already exists");
            }

            asset.AssetCode = request.AssetCode;
            asset.AssetType = request.AssetType;

            asset.Make = request.Make;
            asset.Model = request.Model;

            asset.SerialNumber = request.SerialNumber;
            asset.ManagementIP = request.ManagementIP;
            asset.MAC = request.MAC;
            asset.SiteId = request.SiteId;
            asset.LocationDescription = request.LocationDescription;
            asset.LocationName = request.LocationName;
            asset.DeviceType = request.DeviceType;
            asset.UsedFor = request.UsedFor;
            asset.Criticality = request.Criticality;
            asset.Status = request.Status;
            asset.InstallationDate = request.InstallationDate;
            asset.WarrantyEndDate = request.WarrantyEndDate;
            asset.VmsReferenceId = request.VmsReferenceId;
            asset.NmsReferenceId = request.NmsReferenceId;
            asset.UserName = request.UserName;
            asset.Password = request.Password;
            asset.Remark = request.Remark;
            asset.IsActive = request.IsActive;
            asset.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Asset {AssetId} updated successfully", assetId);

            var dto = await GetAssetByIdAsync(asset.AssetId);
            return ApiResponse<AssetDto>.SuccessResponse(dto!, "Asset updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating asset {AssetId}", assetId);
            return ApiResponse<AssetDto>.FailResponse("An error occurred while updating asset");
        }
    }

    public async Task<ApiResponse<bool>> DeleteAssetAsync(int assetId)
    {
        try
        {
            var asset = await _context.Assets.FindAsync(assetId);
            if (asset == null)
            {
                return ApiResponse<bool>.FailResponse("Asset not found");
            }

            // Check for open tickets
            var hasOpenTickets = await _context.Tickets
                .AnyAsync(t => t.AssetId == assetId && TicketStatuses.ActiveStatuses.Contains(t.Status));

            if (hasOpenTickets)
            {
                return ApiResponse<bool>.FailResponse("Cannot delete asset with open tickets");
            }

            asset.IsActive = false;
            asset.ModifiedOn = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Asset {AssetId} deactivated", assetId);
            return ApiResponse<bool>.SuccessResponse(true, "Asset deactivated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting asset {AssetId}", assetId);
            return ApiResponse<bool>.FailResponse("An error occurred while deleting asset");
        }
    }

    public async Task<List<DropdownOption>> GetAssetsDropdownAsync(int? siteId = null)
    {
        var query = _context.Assets.Where(a => a.IsActive);

        if (siteId.HasValue)
            query = query.Where(a => a.SiteId == siteId.Value);

        return await query
            .OrderBy(a => a.AssetCode)
            .Select(a => new DropdownOption
            {
                Value = a.AssetId.ToString(),
                Label = $"{a.AssetCode} - {a.AssetType}"
            })
            .ToListAsync();
    }

    public async Task<ApiResponse<bool>> UpdateAssetStatusAsync(int assetId, string status)
    {
        try
        {
            var asset = await _context.Assets.FindAsync(assetId);
            if (asset == null)
            {
                return ApiResponse<bool>.FailResponse("Asset not found");
            }

            if (!AssetStatuses.AllStatuses.Contains(status))
            {
                return ApiResponse<bool>.FailResponse("Invalid status");
            }

            asset.Status = status;
            asset.ModifiedOn = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.SuccessResponse(true, "Asset status updated");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating asset status {AssetId}", assetId);
            return ApiResponse<bool>.FailResponse("An error occurred");
        }
    }

    // ============ Bulk Operations ============

    public byte[] GenerateTemplate()
    {
        var headers = new[]
        {
            "AssetCode*",
            "AssetType*",
            "SiteId*",
            "Make",
            "Model",
            "SerialNumber",
            "ManagementIP",
            "MAC",
            "LocationName",
            "LocationDescription",
            "DeviceType",
            "UsedFor",
            "Criticality (1=Low, 2=Medium, 3=High)",
            "Status (Operational/Degraded/Offline/Maintenance)",
            "InstallationDate (YYYY-MM-DD)",
            "WarrantyEndDate (YYYY-MM-DD)",
            "VmsReferenceId",
            "NmsReferenceId",
            "UserName",
            "Password",
            "Remark"
        };

        var sb = new StringBuilder();
        sb.AppendLine(string.Join(",", headers));
        
        // Add sample row
        sb.AppendLine("\"CAM-001\",\"Camera\",\"1\",\"Hikvision\",\"DS-2CD2143G0-I\",\"SN123456\",\"192.168.1.100\",\"AA:BB:CC:DD:EE:FF\",\"Entrance Gate\",\"Main Building Entrance\",\"Dome Camera\",\"Security Monitoring\",\"2\",\"Operational\",\"2024-01-15\",\"2027-01-15\",\"\",\"\",\"admin\",\"password123\",\"Installed during phase 1\"");

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportAssetsAsync(int? siteId = null, string? assetType = null, string? status = null)
    {
        var query = _context.Assets
            .Include(a => a.Site)
            .Where(a => a.IsActive);

        if (siteId.HasValue)
            query = query.Where(a => a.SiteId == siteId.Value);

        if (!string.IsNullOrEmpty(assetType))
            query = query.Where(a => a.AssetType == assetType);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(a => a.Status == status);

        var assets = await query.OrderBy(a => a.AssetCode).ToListAsync();

        var sb = new StringBuilder();
        
        // Headers
        sb.AppendLine("AssetId,AssetCode,AssetType,SiteId,SiteName,Make,Model,SerialNumber,ManagementIP,MAC,LocationName,LocationDescription,DeviceType,UsedFor,Criticality,Status,InstallationDate,WarrantyEndDate,VmsReferenceId,NmsReferenceId,UserName,Remark,IsActive,CreatedOn");

        foreach (var asset in assets)
        {
            sb.AppendLine($"\"{asset.AssetId}\",\"{EscapeCsv(asset.AssetCode)}\",\"{EscapeCsv(asset.AssetType)}\",\"{asset.SiteId}\",\"{EscapeCsv(asset.Site?.SiteName)}\",\"{EscapeCsv(asset.Make)}\",\"{EscapeCsv(asset.Model)}\",\"{EscapeCsv(asset.SerialNumber)}\",\"{EscapeCsv(asset.ManagementIP)}\",\"{EscapeCsv(asset.MAC)}\",\"{EscapeCsv(asset.LocationName)}\",\"{EscapeCsv(asset.LocationDescription)}\",\"{EscapeCsv(asset.DeviceType)}\",\"{EscapeCsv(asset.UsedFor)}\",\"{asset.Criticality}\",\"{EscapeCsv(asset.Status)}\",\"{asset.InstallationDate:yyyy-MM-dd}\",\"{asset.WarrantyEndDate:yyyy-MM-dd}\",\"{EscapeCsv(asset.VmsReferenceId)}\",\"{EscapeCsv(asset.NmsReferenceId)}\",\"{EscapeCsv(asset.UserName)}\",\"{EscapeCsv(asset.Remark)}\",\"{asset.IsActive}\",\"{asset.CreatedOn:yyyy-MM-dd HH:mm:ss}\"");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<ApiResponse<BulkImportResult>> BulkImportAsync(Stream fileStream, int createdByUserId)
    {
        var result = new BulkImportResult();
        var errors = new List<string>();

        try
        {
            using var reader = new StreamReader(fileStream);
            var content = await reader.ReadToEndAsync();
            var lines = content.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);

            if (lines.Length < 2)
            {
                return ApiResponse<BulkImportResult>.FailResponse("File is empty or contains only headers");
            }

            // Get all valid site IDs
            var validSiteIds = await _context.Sites.Where(s => s.IsActive).Select(s => s.SiteId).ToListAsync();
            
            // Get existing asset codes
            var existingAssetCodes = await _context.Assets.Select(a => a.AssetCode).ToListAsync();

            var assetsToCreate = new List<AssetMaster>();
            var rowNumber = 1;

            foreach (var line in lines.Skip(1)) // Skip header
            {
                rowNumber++;
                var columns = ParseCsvLine(line);

                if (columns.Length < 3)
                {
                    errors.Add($"Row {rowNumber}: Insufficient columns. Minimum required: AssetCode, AssetType, SiteId");
                    result.FailedCount++;
                    continue;
                }

                var assetCode = columns[0].Trim();
                var assetType = columns[1].Trim();
                var siteIdStr = columns[2].Trim();

                // Validate required fields
                if (string.IsNullOrWhiteSpace(assetCode))
                {
                    errors.Add($"Row {rowNumber}: AssetCode is required");
                    result.FailedCount++;
                    continue;
                }

                if (string.IsNullOrWhiteSpace(assetType))
                {
                    errors.Add($"Row {rowNumber}: AssetType is required");
                    result.FailedCount++;
                    continue;
                }

                if (!int.TryParse(siteIdStr, out int siteId))
                {
                    errors.Add($"Row {rowNumber}: Invalid SiteId '{siteIdStr}'");
                    result.FailedCount++;
                    continue;
                }

                if (!validSiteIds.Contains(siteId))
                {
                    errors.Add($"Row {rowNumber}: Site with ID {siteId} not found");
                    result.FailedCount++;
                    continue;
                }

                if (!AssetTypes.AllTypes.Contains(assetType))
                {
                    errors.Add($"Row {rowNumber}: Invalid AssetType '{assetType}'. Valid types: {string.Join(", ", AssetTypes.AllTypes)}");
                    result.FailedCount++;
                    continue;
                }

                if (existingAssetCodes.Contains(assetCode) || assetsToCreate.Any(a => a.AssetCode == assetCode))
                {
                    errors.Add($"Row {rowNumber}: AssetCode '{assetCode}' already exists");
                    result.FailedCount++;
                    continue;
                }

                var asset = new AssetMaster
                {
                    AssetCode = assetCode,
                    AssetType = assetType,
                    SiteId = siteId,
                    Make = GetColumn(columns, 3),
                    Model = GetColumn(columns, 4),
                    SerialNumber = GetColumn(columns, 5),
                    ManagementIP = GetColumn(columns, 6),
                    MAC = GetColumn(columns, 7),
                    LocationName = GetColumn(columns, 8),
                    LocationDescription = GetColumn(columns, 9),
                    DeviceType = GetColumn(columns, 10),
                    UsedFor = GetColumn(columns, 11),
                    Criticality = int.TryParse(GetColumn(columns, 12), out int crit) ? Math.Clamp(crit, 1, 3) : 2,
                    Status = ValidateStatus(GetColumn(columns, 13)) ?? "Operational",
                    InstallationDate = DateTime.TryParse(GetColumn(columns, 14), out DateTime instDate) ? instDate : null,
                    WarrantyEndDate = DateTime.TryParse(GetColumn(columns, 15), out DateTime warDate) ? warDate : null,
                    VmsReferenceId = GetColumn(columns, 16),
                    NmsReferenceId = GetColumn(columns, 17),
                    UserName = GetColumn(columns, 18),
                    Password = GetColumn(columns, 19),
                    Remark = GetColumn(columns, 20),
                    IsActive = true,
                    CreatedOn = DateTime.UtcNow
                };

                assetsToCreate.Add(asset);
                result.SuccessCount++;
            }

            if (assetsToCreate.Count > 0)
            {
                _context.Assets.AddRange(assetsToCreate);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Bulk imported {Count} assets", assetsToCreate.Count);
            }

            result.Errors = errors;
            result.TotalProcessed = result.SuccessCount + result.FailedCount;

            if (result.FailedCount > 0 && result.SuccessCount > 0)
            {
                return ApiResponse<BulkImportResult>.SuccessResponse(result, $"Imported {result.SuccessCount} assets with {result.FailedCount} errors");
            }
            else if (result.FailedCount > 0 && result.SuccessCount == 0)
            {
                return ApiResponse<BulkImportResult>.FailResponse($"Import failed. {result.FailedCount} errors found.", result);
            }

            return ApiResponse<BulkImportResult>.SuccessResponse(result, $"Successfully imported {result.SuccessCount} assets");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during bulk import");
            return ApiResponse<BulkImportResult>.FailResponse($"Import failed: {ex.Message}");
        }
    }

    // Helper methods
    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        return value.Replace("\"", "\"\"");
    }

    private static string[] ParseCsvLine(string line)
    {
        var result = new List<string>();
        var inQuotes = false;
        var field = new StringBuilder();

        for (int i = 0; i < line.Length; i++)
        {
            var c = line[i];

            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    field.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(field.ToString());
                field.Clear();
            }
            else
            {
                field.Append(c);
            }
        }
        result.Add(field.ToString());

        return result.ToArray();
    }

    private static string? GetColumn(string[] columns, int index)
    {
        if (index < columns.Length)
        {
            var value = columns[index].Trim();
            return string.IsNullOrWhiteSpace(value) ? null : value;
        }
        return null;
    }

    private static string? ValidateStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return null;
        return AssetStatuses.AllStatuses.Contains(status) ? status : null;
    }
}
