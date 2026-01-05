using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Services;

namespace UCCTicketing.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetsController : ControllerBase
{
    private readonly IAssetService _assetService;

    public AssetsController(IAssetService assetService)
    {
        _assetService = assetService;
    }

    /// <summary>
    /// Get all assets with pagination and filters
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResponse<AssetDto>>> GetAssets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] int? siteId = null,
        [FromQuery] string? assetType = null,
        [FromQuery] string? status = null,
        [FromQuery] bool? isActive = null)
    {
        var userId = GetCurrentUserId();
        var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
        var result = await _assetService.GetAssetsAsync(page, pageSize, search, siteId, assetType, status, isActive, userId, userRole);
        return Ok(result);
    }


    /// <summary>
    /// Get asset by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<AssetDto>>> GetAsset(int id)
    {
        var asset = await _assetService.GetAssetByIdAsync(id);
        if (asset == null)
        {
            return NotFound(ApiResponse<AssetDto>.FailResponse("Asset not found"));
        }
        return Ok(ApiResponse<AssetDto>.SuccessResponse(asset));
    }

    /// <summary>
    /// Create new asset
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Supervisor")]
    public async Task<ActionResult<ApiResponse<AssetDto>>> CreateAsset([FromBody] CreateAssetRequest request)
    {
        var result = await _assetService.CreateAssetAsync(request);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return CreatedAtAction(nameof(GetAsset), new { id = result.Data!.AssetId }, result);
    }

    /// <summary>
    /// Update asset
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Supervisor")]
    public async Task<ActionResult<ApiResponse<AssetDto>>> UpdateAsset(int id, [FromBody] UpdateAssetRequest request)
    {
        var result = await _assetService.UpdateAssetAsync(id, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Delete (deactivate) asset
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteAsset(int id)
    {
        var result = await _assetService.DeleteAssetAsync(id);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Update asset status
    /// </summary>
    [HttpPatch("{id}/status")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateAssetStatus(int id, [FromQuery] string status)
    {
        var result = await _assetService.UpdateAssetStatusAsync(id, status);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Get assets dropdown
    /// </summary>
    [HttpGet("dropdown")]
    public async Task<ActionResult<List<DropdownOption>>> GetAssetsDropdown([FromQuery] int? siteId = null)
    {
        var result = await _assetService.GetAssetsDropdownAsync(siteId);
        return Ok(result);
    }

    /// <summary>
    /// Download import template
    /// </summary>
    [HttpGet("template")]
    [Authorize(Roles = "Admin,Supervisor")]
    public IActionResult DownloadTemplate()
    {
        var template = _assetService.GenerateTemplate();
        return File(template, "text/csv", "assets_import_template.csv");
    }

    /// <summary>
    /// Export assets to CSV
    /// </summary>
    [HttpGet("export")]
    [Authorize(Roles = "Admin,Supervisor")]
    public async Task<IActionResult> ExportAssets(
        [FromQuery] int? siteId = null,
        [FromQuery] string? assetType = null,
        [FromQuery] string? status = null)
    {
        var csvData = await _assetService.ExportAssetsAsync(siteId, assetType, status);
        var fileName = $"assets_export_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
        return File(csvData, "text/csv", fileName);
    }

    /// <summary>
    /// Bulk import assets from CSV or Excel file
    /// </summary>
    [HttpPost("import")]
    [Authorize(Roles = "Admin,Supervisor")]
    public async Task<ActionResult<ApiResponse<BulkImportResult>>> BulkImport(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<BulkImportResult>.FailResponse("Please select a file to upload"));
        }

        var isCsv = file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase);
        var isXlsx = file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase);

        if (!isCsv && !isXlsx)
        {
            return BadRequest(ApiResponse<BulkImportResult>.FailResponse("Only CSV and XLSX files are supported"));
        }

        var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");
        
        using var stream = file.OpenReadStream();
        var result = await _assetService.BulkImportAsync(stream, userId, isXlsx);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
    
    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return claim != null && int.TryParse(claim.Value, out int userId) ? userId : 0;
    }
}
