using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Entities;
using UCCTicketing.API.Services;

namespace UCCTicketing.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public TicketsController(ITicketService ticketService)
    {
        _ticketService = ticketService;
    }

    /// <summary>
    /// Get tickets with filters and pagination
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResponse<TicketListDto>>> GetTickets([FromQuery] TicketFilterRequest filter)
    {
        var userId = GetCurrentUserId();
        var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
        var result = await _ticketService.GetTicketsAsync(filter, userId, userRole);
        return Ok(result);
    }


    /// <summary>
    /// Get ticket by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<TicketDto>>> GetTicket(int id)
    {
        var ticket = await _ticketService.GetTicketByIdAsync(id);
        if (ticket == null)
        {
            return NotFound(ApiResponse<TicketDto>.FailResponse("Ticket not found"));
        }
        return Ok(ApiResponse<TicketDto>.SuccessResponse(ticket));
    }

    /// <summary>
    /// Create new ticket
    /// </summary>
    [HttpPost]
    [Authorize(Roles = $"{UserRoles.Dispatcher},{UserRoles.Supervisor},{UserRoles.Admin}")]
    public async Task<ActionResult<ApiResponse<TicketDto>>> CreateTicket([FromBody] CreateTicketRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _ticketService.CreateTicketAsync(request, userId);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return CreatedAtAction(nameof(GetTicket), new { id = result.Data!.TicketId }, result);
    }

    /// <summary>
    /// Update ticket
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = $"{UserRoles.Dispatcher},{UserRoles.Supervisor},{UserRoles.Admin}")]
    public async Task<ActionResult<ApiResponse<TicketDto>>> UpdateTicket(int id, [FromBody] UpdateTicketRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _ticketService.UpdateTicketAsync(id, request, userId);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Assign ticket to engineer
    /// </summary>
    [HttpPost("{id}/assign")]
    [Authorize(Roles = $"{UserRoles.Dispatcher},{UserRoles.Supervisor},{UserRoles.Admin}")]
    public async Task<ActionResult<ApiResponse<TicketDto>>> AssignTicket(int id, [FromBody] AssignTicketRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _ticketService.AssignTicketAsync(id, request, userId);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Acknowledge ticket (by assigned engineer)
    /// </summary>
    [HttpPost("{id}/acknowledge")]
    [Authorize(Roles = $"{UserRoles.L1Engineer},{UserRoles.L2Engineer},{UserRoles.Supervisor}")]
    public async Task<ActionResult<ApiResponse<TicketDto>>> AcknowledgeTicket(int id)
    {
        var userId = GetCurrentUserId();
        var result = await _ticketService.AcknowledgeTicketAsync(id, userId);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Start work on ticket
    /// </summary>
    [HttpPost("{id}/start")]
    [Authorize(Roles = $"{UserRoles.L1Engineer},{UserRoles.L2Engineer},{UserRoles.Supervisor}")]
    public async Task<ActionResult<ApiResponse<TicketDto>>> StartTicket(int id)
    {
        var userId = GetCurrentUserId();
        var result = await _ticketService.StartTicketAsync(id, userId);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Resolve ticket
    /// </summary>
    [HttpPost("{id}/resolve")]
    [Authorize(Roles = $"{UserRoles.L1Engineer},{UserRoles.L2Engineer},{UserRoles.Supervisor}")]
    public async Task<ActionResult<ApiResponse<TicketDto>>> ResolveTicket(int id, [FromBody] ResolveTicketRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _ticketService.ResolveTicketAsync(id, request, userId);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Verify ticket resolution
    /// </summary>
    [HttpPost("{id}/verify")]
    [Authorize(Roles = $"{UserRoles.Dispatcher},{UserRoles.Supervisor},{UserRoles.Admin}")]
    public async Task<ActionResult<ApiResponse<TicketDto>>> VerifyTicket(int id)
    {
        var userId = GetCurrentUserId();
        var result = await _ticketService.VerifyTicketAsync(id, userId);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Close ticket
    /// </summary>
    [HttpPost("{id}/close")]
    [Authorize(Roles = $"{UserRoles.Admin}")]
    public async Task<ActionResult<ApiResponse<TicketDto>>> CloseTicket(int id, [FromBody] CloseTicketRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _ticketService.CloseTicketAsync(id, request, userId);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Reopen closed ticket
    /// </summary>
    [HttpPost("{id}/reopen")]
    public async Task<ActionResult<ApiResponse<TicketDto>>> ReopenTicket(int id, [FromQuery] string reason)
    {
        var userId = GetCurrentUserId();
        var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
        var result = await _ticketService.ReopenTicketAsync(id, userId, userRole, reason);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Get ticket audit trail
    /// </summary>
    [HttpGet("{id}/audit")]
    public async Task<ActionResult<List<AuditTrailDto>>> GetTicketAuditTrail(int id)
    {
        var result = await _ticketService.GetTicketAuditTrailAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Get dashboard statistics
    /// </summary>
    [HttpGet("dashboard/stats")]
    public async Task<ActionResult<DashboardStatsDto>> GetDashboardStats()
    {
        var userId = GetCurrentUserId();
        var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
        var result = await _ticketService.GetDashboardStatsAsync(userId, userRole);
        return Ok(result);
    }


    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return claim != null && int.TryParse(claim.Value, out int userId) ? userId : 0;
    }
}
