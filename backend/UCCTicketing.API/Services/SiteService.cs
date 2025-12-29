using Microsoft.EntityFrameworkCore;
using UCCTicketing.API.Data;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Entities;

namespace UCCTicketing.API.Services;

public interface ISiteService
{
    Task<PagedResponse<SiteDto>> GetSitesAsync(int page, int pageSize, string? city = null, bool? isActive = null);
    Task<SiteDto?> GetSiteByIdAsync(int siteId);
    Task<ApiResponse<SiteDto>> CreateSiteAsync(CreateSiteRequest request);
    Task<ApiResponse<SiteDto>> UpdateSiteAsync(int siteId, UpdateSiteRequest request);
    Task<ApiResponse<bool>> DeleteSiteAsync(int siteId);
    Task<List<DropdownOption>> GetSitesDropdownAsync();
    Task<List<string>> GetCitiesAsync();
}

public class SiteService : ISiteService
{
    private readonly UCCDbContext _context;
    private readonly ILogger<SiteService> _logger;

    public SiteService(UCCDbContext context, ILogger<SiteService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PagedResponse<SiteDto>> GetSitesAsync(int page, int pageSize, string? city = null, bool? isActive = null)
    {
        var query = _context.Sites
            .Include(s => s.Assets)
            .Include(s => s.AssignedEngineers)
            .AsQueryable();

        if (!string.IsNullOrEmpty(city))
            query = query.Where(s => s.City == city);

        if (isActive.HasValue)
            query = query.Where(s => s.IsActive == isActive.Value);

        var totalCount = await query.CountAsync();

        var sites = await query
            .OrderBy(s => s.SiteName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SiteDto
            {
                SiteId = s.SiteId,
                SiteName = s.SiteName,
                City = s.City,
                Zone = s.Zone,
                Ward = s.Ward,
                Address = s.Address,
                Latitude = s.Latitude,
                Longitude = s.Longitude,
                ContactPerson = s.ContactPerson,
                ContactPhone = s.ContactPhone,
                IsActive = s.IsActive,
                CreatedOn = s.CreatedOn,
                AssetCount = s.Assets.Count,
                EngineerCount = s.AssignedEngineers.Count
            })
            .ToListAsync();

        return new PagedResponse<SiteDto>
        {
            Items = sites,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<SiteDto?> GetSiteByIdAsync(int siteId)
    {
        return await _context.Sites
            .Include(s => s.Assets)
            .Include(s => s.AssignedEngineers)
            .Where(s => s.SiteId == siteId)
            .Select(s => new SiteDto
            {
                SiteId = s.SiteId,
                SiteName = s.SiteName,
                City = s.City,
                Zone = s.Zone,
                Ward = s.Ward,
                Address = s.Address,
                Latitude = s.Latitude,
                Longitude = s.Longitude,
                ContactPerson = s.ContactPerson,
                ContactPhone = s.ContactPhone,
                IsActive = s.IsActive,
                CreatedOn = s.CreatedOn,
                AssetCount = s.Assets.Count,
                EngineerCount = s.AssignedEngineers.Count
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ApiResponse<SiteDto>> CreateSiteAsync(CreateSiteRequest request)
    {
        try
        {
            var site = new SiteMaster
            {
                SiteName = request.SiteName,
                City = request.City,
                Zone = request.Zone,
                Ward = request.Ward,
                Address = request.Address,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                ContactPerson = request.ContactPerson,
                ContactPhone = request.ContactPhone,
                IsActive = true,
                CreatedOn = DateTime.UtcNow
            };

            _context.Sites.Add(site);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Site {SiteName} created successfully", site.SiteName);

            var dto = await GetSiteByIdAsync(site.SiteId);
            return ApiResponse<SiteDto>.SuccessResponse(dto!, "Site created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating site");
            return ApiResponse<SiteDto>.FailResponse("An error occurred while creating site");
        }
    }

    public async Task<ApiResponse<SiteDto>> UpdateSiteAsync(int siteId, UpdateSiteRequest request)
    {
        try
        {
            var site = await _context.Sites.FindAsync(siteId);
            if (site == null)
            {
                return ApiResponse<SiteDto>.FailResponse("Site not found");
            }

            site.SiteName = request.SiteName;
            site.City = request.City;
            site.Zone = request.Zone;
            site.Ward = request.Ward;
            site.Address = request.Address;
            site.Latitude = request.Latitude;
            site.Longitude = request.Longitude;
            site.ContactPerson = request.ContactPerson;
            site.ContactPhone = request.ContactPhone;
            site.IsActive = request.IsActive;
            site.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Site {SiteId} updated successfully", siteId);

            var dto = await GetSiteByIdAsync(site.SiteId);
            return ApiResponse<SiteDto>.SuccessResponse(dto!, "Site updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating site {SiteId}", siteId);
            return ApiResponse<SiteDto>.FailResponse("An error occurred while updating site");
        }
    }

    public async Task<ApiResponse<bool>> DeleteSiteAsync(int siteId)
    {
        try
        {
            var site = await _context.Sites.FindAsync(siteId);
            if (site == null)
            {
                return ApiResponse<bool>.FailResponse("Site not found");
            }

            // Check if site has assets
            var hasAssets = await _context.Assets.AnyAsync(a => a.SiteId == siteId);
            if (hasAssets)
            {
                return ApiResponse<bool>.FailResponse("Cannot delete site with assets. Deactivate instead.");
            }

            site.IsActive = false;
            site.ModifiedOn = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Site {SiteId} deactivated", siteId);
            return ApiResponse<bool>.SuccessResponse(true, "Site deactivated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting site {SiteId}", siteId);
            return ApiResponse<bool>.FailResponse("An error occurred while deleting site");
        }
    }

    public async Task<List<DropdownOption>> GetSitesDropdownAsync()
    {
        return await _context.Sites
            .Where(s => s.IsActive)
            .OrderBy(s => s.SiteName)
            .Select(s => new DropdownOption
            {
                Value = s.SiteId.ToString(),
                Label = $"{s.SiteName} ({s.City})"
            })
            .ToListAsync();
    }

    public async Task<List<string>> GetCitiesAsync()
    {
        return await _context.Sites
            .Where(s => s.IsActive)
            .Select(s => s.City)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
    }
}
