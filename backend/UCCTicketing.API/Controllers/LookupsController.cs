using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UCCTicketing.API.Data;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Entities;

namespace UCCTicketing.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LookupsController : ControllerBase
{
    private readonly UCCDbContext _context;

    public LookupsController(UCCDbContext context)
    {
        _context = context;
    }

    // Get all dropdown options for forms
    [HttpGet]
    public async Task<ActionResult<DropdownOptionsDto>> GetAllOptions()
    {
        // Get distinct asset types from the database
        var assetTypesFromDb = await _context.Assets
            .Where(a => a.IsActive && !string.IsNullOrEmpty(a.AssetType))
            .Select(a => a.AssetType)
            .Distinct()
            .OrderBy(t => t)
            .ToListAsync();

        var options = new DropdownOptionsDto
        {
            Statuses = TicketStatuses.AllStatuses.Select(s => new DropdownOption { Value = s, Label = FormatLabel(s) }).ToList(),
            Priorities = TicketPriorities.AllPriorities.Select(p => new DropdownOption { Value = p, Label = GetPriorityLabel(p) }).ToList(),
            Categories = TicketCategories.AllCategories.Select(c => new DropdownOption { Value = c, Label = c }).ToList(),
            AssetTypes = assetTypesFromDb.Select(t => new DropdownOption { Value = t, Label = t }).ToList(),
            Roles = UserRoles.AllRoles.Select(r => new DropdownOption { Value = r, Label = FormatLabel(r) }).ToList()
        };

        return Ok(options);
    }

    // Get ticket statuses
    [HttpGet("statuses")]
    public ActionResult<List<DropdownOption>> GetStatuses()
    {
        var statuses = TicketStatuses.AllStatuses
            .Select(s => new DropdownOption { Value = s, Label = FormatLabel(s) })
            .ToList();
        return Ok(statuses);
    }

    // Get ticket priorities
    [HttpGet("priorities")]
    public ActionResult<List<DropdownOption>> GetPriorities()
    {
        var priorities = TicketPriorities.AllPriorities
            .Select(p => new DropdownOption { Value = p, Label = GetPriorityLabel(p) })
            .ToList();
        return Ok(priorities);
    }

    // Get ticket categories
    [HttpGet("categories")]
    public ActionResult<List<DropdownOption>> GetCategories()
    {
        var categories = TicketCategories.AllCategories
            .Select(c => new DropdownOption { Value = c, Label = c })
            .ToList();
        return Ok(categories);
    }

    // Get asset types (dynamically from database)
    [HttpGet("asset-types")]
    public async Task<ActionResult<List<DropdownOption>>> GetAssetTypes()
    {
        // Get distinct asset types from the database
        var types = await _context.Assets
            .Where(a => a.IsActive && !string.IsNullOrEmpty(a.AssetType))
            .Select(a => a.AssetType)
            .Distinct()
            .OrderBy(t => t)
            .Select(t => new DropdownOption { Value = t, Label = t })
            .ToListAsync();

        return Ok(types);
    }

    // Get asset statuses
    [HttpGet("asset-statuses")]
    public ActionResult<List<DropdownOption>> GetAssetStatuses()
    {
        var statuses = AssetStatuses.AllStatuses
            .Select(s => new DropdownOption { Value = s, Label = s })
            .ToList();
        return Ok(statuses);
    }

    /// <summary>
    /// Get user roles
    /// </summary>
    [HttpGet("roles")]
    public ActionResult<List<DropdownOption>> GetRoles()
    {
        var roles = UserRoles.AllRoles
            .Select(r => new DropdownOption { Value = r, Label = FormatLabel(r) })
            .ToList();
        return Ok(roles);
    }

    private static string FormatLabel(string value)
    {
        // Convert PascalCase to Title Case with spaces
        return string.Concat(value.Select((x, i) => i > 0 && char.IsUpper(x) ? " " + x : x.ToString()));
    }

    private static string GetPriorityLabel(string priority)
    {
        return priority switch
        {
            "P1" => "P1 - Critical",
            "P2" => "P2 - High",
            "P3" => "P3 - Medium",
            "P4" => "P4 - Low",
            _ => priority
        };
    }
}
