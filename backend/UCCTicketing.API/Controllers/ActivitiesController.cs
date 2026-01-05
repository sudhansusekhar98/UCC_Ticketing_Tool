using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Services;
using System.Security.Claims;

namespace UCCTicketing.API.Controllers;

[ApiController]
[Route("api/tickets/{ticketId}/activities")]
[Authorize]
public class ActivitiesController : ControllerBase
{
    private readonly IActivityService _activityService;

    public ActivitiesController(IActivityService activityService)
    {
        _activityService = activityService;
    }

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    private string GetUserRole() => User.FindFirst(ClaimTypes.Role)?.Value ?? "";

    [HttpGet]
    public async Task<IActionResult> GetActivities(int ticketId)
    {
        var result = await _activityService.GetActivitiesByTicketAsync(ticketId, GetUserId(), GetUserRole());
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateActivity(int ticketId, [FromBody] CreateActivityRequest request)
    {
        var result = await _activityService.CreateActivityAsync(ticketId, request, GetUserId());
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("attachments")]
    public async Task<IActionResult> UploadAttachment(int ticketId, [FromQuery] int? activityId, [FromForm] IFormFile file)
    {
        var result = await _activityService.UploadAttachmentAsync(ticketId, activityId, file, GetUserId());
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }
}

// Separate controller for attachment operations
[ApiController]
[Route("api/activities/attachments")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly IActivityService _activityService;
    private readonly UCCTicketing.API.Data.UCCDbContext _context;

    public AttachmentsController(IActivityService activityService, UCCTicketing.API.Data.UCCDbContext context)
    {
        _activityService = activityService;
        _context = context;
    }

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    [HttpGet("{attachmentId}/download")]
    public async Task<IActionResult> DownloadAttachment(int attachmentId)
    {
        var attachment = await _context.TicketAttachments.FindAsync(attachmentId);
        if (attachment == null)
            return NotFound();

        if (attachment.StorageType != "Database" || attachment.FileData == null)
            return BadRequest("File not available for download");

        return File(attachment.FileData, attachment.ContentType, attachment.FileName);
    }

    [HttpDelete("{attachmentId}")]
    public async Task<IActionResult> DeleteAttachment(int attachmentId)
    {
        var result = await _activityService.DeleteAttachmentAsync(attachmentId, GetUserId());
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }
}
