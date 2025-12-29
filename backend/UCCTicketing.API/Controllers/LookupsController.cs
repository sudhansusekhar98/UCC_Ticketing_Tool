using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Entities;

namespace UCCTicketing.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LookupsController : ControllerBase
{
    /// <summary>
    /// Get all dropdown options for forms
    /// </summary>
    [HttpGet]
    public ActionResult<DropdownOptionsDto> GetAllOptions()
    {
        var options = new DropdownOptionsDto
        {
            Statuses = TicketStatuses.AllStatuses.Select(s => new DropdownOption { Value = s, Label = FormatLabel(s) }).ToList(),
            Priorities = TicketPriorities.AllPriorities.Select(p => new DropdownOption { Value = p, Label = GetPriorityLabel(p) }).ToList(),
            Categories = TicketCategories.AllCategories.Select(c => new DropdownOption { Value = c, Label = c }).ToList(),
            AssetTypes = AssetTypes.AllTypes.Select(t => new DropdownOption { Value = t, Label = t }).ToList(),
            Roles = UserRoles.AllRoles.Select(r => new DropdownOption { Value = r, Label = FormatLabel(r) }).ToList()
        };

        return Ok(options);
    }

    /// <summary>
    /// Get ticket statuses
    /// </summary>
    [HttpGet("statuses")]
    public ActionResult<List<DropdownOption>> GetStatuses()
    {
        var statuses = TicketStatuses.AllStatuses
            .Select(s => new DropdownOption { Value = s, Label = FormatLabel(s) })
            .ToList();
        return Ok(statuses);
    }

    /// <summary>
    /// Get ticket priorities
    /// </summary>
    [HttpGet("priorities")]
    public ActionResult<List<DropdownOption>> GetPriorities()
    {
        var priorities = TicketPriorities.AllPriorities
            .Select(p => new DropdownOption { Value = p, Label = GetPriorityLabel(p) })
            .ToList();
        return Ok(priorities);
    }

    /// <summary>
    /// Get ticket categories
    /// </summary>
    [HttpGet("categories")]
    public ActionResult<List<DropdownOption>> GetCategories()
    {
        var categories = TicketCategories.AllCategories
            .Select(c => new DropdownOption { Value = c, Label = c })
            .ToList();
        return Ok(categories);
    }

    /// <summary>
    /// Get asset types
    /// </summary>
    [HttpGet("asset-types")]
    public ActionResult<List<DropdownOption>> GetAssetTypes()
    {
        var types = AssetTypes.AllTypes
            .Select(t => new DropdownOption { Value = t, Label = t })
            .ToList();
        return Ok(types);
    }

    /// <summary>
    /// Get asset statuses
    /// </summary>
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
