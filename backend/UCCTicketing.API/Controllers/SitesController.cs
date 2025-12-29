using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Services;

namespace UCCTicketing.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SitesController : ControllerBase
{
    private readonly ISiteService _siteService;

    public SitesController(ISiteService siteService)
    {
        _siteService = siteService;
    }

    /// <summary>
    /// Get all sites with pagination
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResponse<SiteDto>>> GetSites(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? city = null,
        [FromQuery] bool? isActive = null)
    {
        var result = await _siteService.GetSitesAsync(page, pageSize, city, isActive);
        return Ok(result);
    }

    /// <summary>
    /// Get site by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<SiteDto>>> GetSite(int id)
    {
        var site = await _siteService.GetSiteByIdAsync(id);
        if (site == null)
        {
            return NotFound(ApiResponse<SiteDto>.FailResponse("Site not found"));
        }
        return Ok(ApiResponse<SiteDto>.SuccessResponse(site));
    }

    /// <summary>
    /// Create new site
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Supervisor")]
    public async Task<ActionResult<ApiResponse<SiteDto>>> CreateSite([FromBody] CreateSiteRequest request)
    {
        var result = await _siteService.CreateSiteAsync(request);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return CreatedAtAction(nameof(GetSite), new { id = result.Data!.SiteId }, result);
    }

    /// <summary>
    /// Update site
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Supervisor")]
    public async Task<ActionResult<ApiResponse<SiteDto>>> UpdateSite(int id, [FromBody] UpdateSiteRequest request)
    {
        var result = await _siteService.UpdateSiteAsync(id, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Delete (deactivate) site
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteSite(int id)
    {
        var result = await _siteService.DeleteSiteAsync(id);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Get sites dropdown
    /// </summary>
    [HttpGet("dropdown")]
    public async Task<ActionResult<List<DropdownOption>>> GetSitesDropdown()
    {
        var result = await _siteService.GetSitesDropdownAsync();
        return Ok(result);
    }

    /// <summary>
    /// Get list of cities
    /// </summary>
    [HttpGet("cities")]
    public async Task<ActionResult<List<string>>> GetCities()
    {
        var result = await _siteService.GetCitiesAsync();
        return Ok(result);
    }
}
