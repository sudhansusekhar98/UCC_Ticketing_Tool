using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Services;

namespace UCCTicketing.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<SettingsController> _logger;

    public SettingsController(ISettingsService settingsService, ILogger<SettingsController> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    /// <summary>
    /// Get all system settings grouped by category
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<Dictionary<string, Dictionary<string, string>>>>> GetAllSettings()
    {
        try
        {
            var settings = await _settingsService.GetAllSettingsAsync();
            return Ok(ApiResponse<Dictionary<string, Dictionary<string, string>>>.SuccessResponse(settings));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting settings");
            return StatusCode(500, ApiResponse<object>.FailResponse("Failed to load settings"));
        }
    }

    /// <summary>
    /// Get settings for a specific category
    /// </summary>
    [HttpGet("{category}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<Dictionary<string, string>>>> GetSettingsByCategory(string category)
    {
        try
        {
            var settings = await _settingsService.GetSettingsByCategoryAsync(category);
            return Ok(ApiResponse<Dictionary<string, string>>.SuccessResponse(settings));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting settings for category {Category}", category);
            return StatusCode(500, ApiResponse<object>.FailResponse("Failed to load settings"));
        }
    }

    /// <summary>
    /// Update all settings
    /// </summary>
    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateSettings([FromBody] Dictionary<string, Dictionary<string, string>> settings)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(ApiResponse<object>.FailResponse("Invalid user"));
            }

            var success = await _settingsService.UpdateSettingsAsync(settings, userId);

            if (success)
            {
                return Ok(ApiResponse<object>.SuccessResponse(null, "Settings updated successfully"));
            }

            return BadRequest(ApiResponse<object>.FailResponse("Failed to update settings"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating settings");
            return StatusCode(500, ApiResponse<object>.FailResponse("Failed to update settings"));
        }
    }

    /// <summary>
    /// Update a single setting
    /// </summary>
    [HttpPatch("{category}/{key}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateSetting(string category, string key, [FromBody] UpdateSettingRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(ApiResponse<object>.FailResponse("Invalid user"));
            }

            var success = await _settingsService.UpdateSettingAsync(category, key, request.Value, userId);

            if (success)
            {
                return Ok(ApiResponse<object>.SuccessResponse(null, "Setting updated successfully"));
            }

            return BadRequest(ApiResponse<object>.FailResponse("Failed to update setting"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating setting {Category}.{Key}", category, key);
            return StatusCode(500, ApiResponse<object>.FailResponse("Failed to update setting"));
        }
    }
}

/// <summary>
/// Request DTO for updating a single setting
/// </summary>
public class UpdateSettingRequest
{
    public string Value { get; set; } = string.Empty;
}
