using Microsoft.EntityFrameworkCore;
using UCCTicketing.API.Data;
using UCCTicketing.API.DTOs;
using UCCTicketing.API.Entities;
using UCCTicketing.API.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace UCCTicketing.API.Services;

public interface ITicketService
{
    Task<PagedResponse<TicketListDto>> GetTicketsAsync(TicketFilterRequest filter, int userId = 0, string userRole = "");
    Task<TicketDto?> GetTicketByIdAsync(int ticketId);
    Task<ApiResponse<TicketDto>> CreateTicketAsync(CreateTicketRequest request, int createdBy);
    Task<ApiResponse<TicketDto>> UpdateTicketAsync(int ticketId, UpdateTicketRequest request, int modifiedBy);
    Task<ApiResponse<TicketDto>> AssignTicketAsync(int ticketId, AssignTicketRequest request, int assignedBy);
    Task<ApiResponse<TicketDto>> AcknowledgeTicketAsync(int ticketId, int acknowledgedBy);
    Task<ApiResponse<TicketDto>> StartTicketAsync(int ticketId, int startedBy);
    Task<ApiResponse<TicketDto>> ResolveTicketAsync(int ticketId, ResolveTicketRequest request, int resolvedBy);
    Task<ApiResponse<TicketDto>> VerifyTicketAsync(int ticketId, int verifiedBy);
    Task<ApiResponse<TicketDto>> CloseTicketAsync(int ticketId, CloseTicketRequest request, int closedBy);
    Task<ApiResponse<TicketDto>> ReopenTicketAsync(int ticketId, int reopenedBy, string userRole, string reason);
    Task<List<AuditTrailDto>> GetTicketAuditTrailAsync(int ticketId);
    Task<DashboardStatsDto> GetDashboardStatsAsync(int userId, string userRole);
}

public class TicketService : ITicketService
{
    private readonly UCCDbContext _context;
    private readonly ILogger<TicketService> _logger;
    private readonly IHubContext<TicketHub> _hubContext;

    public TicketService(UCCDbContext context, ILogger<TicketService> logger, IHubContext<TicketHub> hubContext)
    {
        _context = context;
        _logger = logger;
        _hubContext = hubContext;
    }

    public async Task<PagedResponse<TicketListDto>> GetTicketsAsync(TicketFilterRequest filter, int userId = 0, string userRole = "")
    {
        var query = _context.Tickets
            .Include(t => t.Asset)
            .ThenInclude(a => a!.Site)
            .Include(t => t.Assignee)
            .AsQueryable();

        // Filter by user role
        if (userId > 0 && !string.IsNullOrEmpty(userRole) && userRole != UserRoles.Admin)
        {
            switch (userRole)
            {
                case UserRoles.ClientViewer:
                    query = query.Where(t => t.CreatedBy == userId);
                    break;
                case UserRoles.L1Engineer:
                case UserRoles.L2Engineer:
                    query = query.Where(t => t.AssignedTo == userId);
                    break;
                case UserRoles.Supervisor:
                case UserRoles.Dispatcher:
                    var user = await _context.Users.FindAsync(userId);
                    if (user?.SiteId != null)
                    {
                        query = query.Where(t => t.Asset != null && t.Asset.SiteId == user.SiteId.Value);
                    }
                    else
                    {
                        // If a supervisor/dispatcher has no site, they see no tickets.
                        query = query.Where(t => false);
                    }
                    break;
                default:
                    // For any other role, they see no tickets unless they are admin.
                    query = query.Where(t => false);
                    break;
            }
        }


        // Apply filters
        if (!string.IsNullOrEmpty(filter.Status))
            query = query.Where(t => t.Status == filter.Status);

        if (!string.IsNullOrEmpty(filter.Priority))
            query = query.Where(t => t.Priority == filter.Priority);

        if (!string.IsNullOrEmpty(filter.Category))
            query = query.Where(t => t.Category == filter.Category);

        if (filter.AssignedTo.HasValue)
            query = query.Where(t => t.AssignedTo == filter.AssignedTo.Value);

        if (filter.SiteId.HasValue)
            query = query.Where(t => t.Asset != null && t.Asset.SiteId == filter.SiteId.Value);

        if (filter.AssetId.HasValue)
            query = query.Where(t => t.AssetId == filter.AssetId.Value);

        if (filter.FromDate.HasValue)
            query = query.Where(t => t.CreatedOn >= filter.FromDate.Value);

        if (filter.ToDate.HasValue)
            query = query.Where(t => t.CreatedOn <= filter.ToDate.Value);

        if (filter.IsSLABreached.HasValue)
            query = query.Where(t => t.IsSLAResponseBreached == filter.IsSLABreached.Value || t.IsSLARestoreBreached == filter.IsSLABreached.Value);

        if (!string.IsNullOrEmpty(filter.SearchTerm))
        {
            var searchTerm = filter.SearchTerm.ToLower();
            query = query.Where(t =>
                t.TicketNumber.ToLower().Contains(searchTerm) ||
                t.Title.ToLower().Contains(searchTerm) ||
                (t.Asset != null && t.Asset.AssetCode.ToLower().Contains(searchTerm)));
        }


        var totalCount = await query.CountAsync();

        // Apply sorting
        query = filter.SortBy.ToLower() switch
        {
            "priority" => filter.SortDescending ? query.OrderByDescending(t => t.Priority) : query.OrderBy(t => t.Priority),
            "status" => filter.SortDescending ? query.OrderByDescending(t => t.Status) : query.OrderBy(t => t.Status),
            "slarestoredue" => filter.SortDescending ? query.OrderByDescending(t => t.SLARestoreDue) : query.OrderBy(t => t.SLARestoreDue),
            _ => filter.SortDescending ? query.OrderByDescending(t => t.CreatedOn) : query.OrderBy(t => t.CreatedOn)
        };

        var tickets = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(t => new TicketListDto
            {
                TicketId = t.TicketId,
                TicketNumber = t.TicketNumber,
                AssetCode = t.Asset != null ? t.Asset.AssetCode : null,
                SiteName = t.Asset != null ? t.Asset.Site.SiteName : null,
                Category = t.Category,
                Title = t.Title,
                Priority = t.Priority,
                Status = t.Status,
                AssignedToName = t.Assignee != null ? t.Assignee.FullName : null,
                CreatedOn = t.CreatedOn,
                SLARestoreDue = t.SLARestoreDue,
                IsSLABreached = t.IsSLAResponseBreached || t.IsSLARestoreBreached,
                SLAStatus = GetSLAStatus(t)
            })
            .ToListAsync();

        return new PagedResponse<TicketListDto>
        {
            Items = tickets,
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = filter.PageSize
        };
    }

    public async Task<TicketDto?> GetTicketByIdAsync(int ticketId)
    {
        return await _context.Tickets
            .Include(t => t.Asset)
            .ThenInclude(a => a!.Site)
            .Include(t => t.Creator)
            .Include(t => t.Assignee)
            .Include(t => t.Attachments)
            .Include(t => t.WorkOrders)
            .Where(t => t.TicketId == ticketId)
            .Select(t => new TicketDto
            {
                TicketId = t.TicketId,
                TicketNumber = t.TicketNumber,
                AssetId = t.AssetId,
                AssetCode = t.Asset != null ? t.Asset.AssetCode : null,
                AssetType = t.Asset != null ? t.Asset.AssetType : null,
                SiteName = t.Asset != null ? t.Asset.Site.SiteName : null,
                Category = t.Category,
                SubCategory = t.SubCategory,
                Title = t.Title,
                Description = t.Description,
                Priority = t.Priority,
                PriorityScore = t.PriorityScore,
                Impact = t.Impact,
                Urgency = t.Urgency,
                Status = t.Status,
                Source = t.Source,
                CreatedBy = t.CreatedBy,
                CreatedByName = t.Creator.FullName,
                AssignedTo = t.AssignedTo,
                AssignedToName = t.Assignee != null ? t.Assignee.FullName : null,
                CreatedOn = t.CreatedOn,
                AssignedOn = t.AssignedOn,
                AcknowledgedOn = t.AcknowledgedOn,
                ResolvedOn = t.ResolvedOn,
                ClosedOn = t.ClosedOn,
                SLAResponseDue = t.SLAResponseDue,
                SLARestoreDue = t.SLARestoreDue,
                IsSLAResponseBreached = t.IsSLAResponseBreached,
                IsSLARestoreBreached = t.IsSLARestoreBreached,
                EscalationLevel = t.EscalationLevel,
                RootCause = t.RootCause,
                ResolutionSummary = t.ResolutionSummary,
                Tags = t.Tags,
                SLAStatus = GetSLAStatus(t),
                AttachmentCount = t.Attachments.Count,
                WorkOrderCount = t.WorkOrders.Count
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ApiResponse<TicketDto>> CreateTicketAsync(CreateTicketRequest request, int createdBy)
    {
        try
        {
            // Get asset criticality if asset is provided
            int assetCriticality = 2;
            if (request.AssetId.HasValue)
            {
                var asset = await _context.Assets.FindAsync(request.AssetId.Value);
                if (asset != null)
                    assetCriticality = asset.Criticality;
            }

            // Calculate priority score
            int priorityScore = request.Impact * request.Urgency * assetCriticality;
            string priority = TicketPriorities.CalculatePriority(priorityScore);

            // Get SLA policy
            var slaPolicy = await _context.SLAPolicies
                .FirstOrDefaultAsync(s => s.Priority == priority && s.IsActive);

            // Generate ticket number
            string ticketNumber = await GenerateTicketNumberAsync();

            var ticket = new TicketMaster
            {
                TicketNumber = ticketNumber,
                AssetId = request.AssetId,
                Category = request.Category,
                SubCategory = request.SubCategory,
                Title = request.Title,
                Description = request.Description,
                Priority = priority,
                PriorityScore = priorityScore,
                Impact = request.Impact,
                Urgency = request.Urgency,
                Status = request.AssignedTo.HasValue ? TicketStatuses.Assigned : TicketStatuses.Open,
                Source = "Manual",
                CreatedBy = createdBy,
                AssignedTo = request.AssignedTo,
                AssignedOn = request.AssignedTo.HasValue ? DateTime.UtcNow : null,
                SLAPolicyId = slaPolicy?.PolicyId,
                Tags = request.Tags,
                CreatedOn = DateTime.UtcNow
            };

            // Set SLA due times
            if (slaPolicy != null)
            {
                ticket.SLAResponseDue = ticket.CreatedOn.AddMinutes(slaPolicy.ResponseTimeMinutes);
                ticket.SLARestoreDue = ticket.CreatedOn.AddMinutes(slaPolicy.RestoreTimeMinutes);
            }

            _context.Tickets.Add(ticket);
            await _context.SaveChangesAsync();

            // Add audit trail
            await AddAuditTrailAsync(ticket.TicketId, AuditActions.Created, null, ticket.Status, "Ticket created", createdBy);

            // Notify via SignalR
            await _hubContext.Clients.All.SendAsync("TicketCreated", ticket.TicketNumber, priority);

            _logger.LogInformation("Ticket {TicketNumber} created by user {UserId}", ticket.TicketNumber, createdBy);

            var dto = await GetTicketByIdAsync(ticket.TicketId);
            return ApiResponse<TicketDto>.SuccessResponse(dto!, "Ticket created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating ticket");
            return ApiResponse<TicketDto>.FailResponse("An error occurred while creating ticket");
        }
    }

    public async Task<ApiResponse<TicketDto>> UpdateTicketAsync(int ticketId, UpdateTicketRequest request, int modifiedBy)
    {
        try
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);
            if (ticket == null)
            {
                return ApiResponse<TicketDto>.FailResponse("Ticket not found");
            }

            // Recalculate priority if impact/urgency changed
            if (ticket.Impact != request.Impact || ticket.Urgency != request.Urgency)
            {
                int assetCriticality = 2;
                if (ticket.AssetId.HasValue)
                {
                    var asset = await _context.Assets.FindAsync(ticket.AssetId.Value);
                    if (asset != null)
                        assetCriticality = asset.Criticality;
                }

                ticket.PriorityScore = request.Impact * request.Urgency * assetCriticality;
                var newPriority = TicketPriorities.CalculatePriority(ticket.PriorityScore);

                if (ticket.Priority != newPriority)
                {
                    await AddAuditTrailAsync(ticketId, AuditActions.PriorityChanged, ticket.Priority, newPriority, "Priority recalculated", modifiedBy);
                    ticket.Priority = newPriority;
                }
            }

            ticket.Category = request.Category;
            ticket.SubCategory = request.SubCategory;
            ticket.Title = request.Title;
            ticket.Description = request.Description;
            ticket.Impact = request.Impact;
            ticket.Urgency = request.Urgency;
            ticket.Tags = request.Tags;
            ticket.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Ticket {TicketId} updated by user {UserId}", ticketId, modifiedBy);

            var dto = await GetTicketByIdAsync(ticket.TicketId);
            return ApiResponse<TicketDto>.SuccessResponse(dto!, "Ticket updated successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating ticket {TicketId}", ticketId);
            return ApiResponse<TicketDto>.FailResponse("An error occurred while updating ticket");
        }
    }

    public async Task<ApiResponse<TicketDto>> AssignTicketAsync(int ticketId, AssignTicketRequest request, int assignedBy)
    {
        try
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);
            if (ticket == null)
            {
                return ApiResponse<TicketDto>.FailResponse("Ticket not found");
            }

            var engineer = await _context.Users.FindAsync(request.AssignedTo);
            if (engineer == null || !engineer.IsActive)
            {
                return ApiResponse<TicketDto>.FailResponse("Engineer not found or inactive");
            }

            var oldAssignee = ticket.AssignedTo?.ToString() ?? "Unassigned";

            ticket.AssignedTo = request.AssignedTo;
            ticket.AssignedOn = DateTime.UtcNow;
            ticket.Status = TicketStatuses.Assigned;
            ticket.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await AddAuditTrailAsync(ticketId, AuditActions.Assigned, oldAssignee, engineer.FullName, request.Remarks, assignedBy);

            // Notify via SignalR
            await _hubContext.Clients.User(request.AssignedTo.ToString()).SendAsync("TicketAssigned", ticket.TicketNumber);

            _logger.LogInformation("Ticket {TicketId} assigned to {EngineerId} by {AssignedBy}", ticketId, request.AssignedTo, assignedBy);

            var dto = await GetTicketByIdAsync(ticket.TicketId);
            return ApiResponse<TicketDto>.SuccessResponse(dto!, "Ticket assigned successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning ticket {TicketId}", ticketId);
            return ApiResponse<TicketDto>.FailResponse("An error occurred while assigning ticket");
        }
    }

    public async Task<ApiResponse<TicketDto>> AcknowledgeTicketAsync(int ticketId, int acknowledgedBy)
    {
        try
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);
            if (ticket == null)
            {
                return ApiResponse<TicketDto>.FailResponse("Ticket not found");
            }

            if (ticket.Status != TicketStatuses.Assigned)
            {
                return ApiResponse<TicketDto>.FailResponse("Ticket cannot be acknowledged in current status");
            }

            ticket.Status = TicketStatuses.Acknowledged;
            ticket.AcknowledgedOn = DateTime.UtcNow;
            ticket.ModifiedOn = DateTime.UtcNow;

            // Check SLA response breach
            if (ticket.SLAResponseDue.HasValue && DateTime.UtcNow > ticket.SLAResponseDue.Value)
            {
                ticket.IsSLAResponseBreached = true;
                await AddAuditTrailAsync(ticketId, AuditActions.SLABreached, null, "Response SLA Breached", null, acknowledgedBy);
            }

            await _context.SaveChangesAsync();

            await AddAuditTrailAsync(ticketId, AuditActions.Acknowledged, TicketStatuses.Assigned, TicketStatuses.Acknowledged, null, acknowledgedBy);

            _logger.LogInformation("Ticket {TicketId} acknowledged by {UserId}", ticketId, acknowledgedBy);

            var dto = await GetTicketByIdAsync(ticket.TicketId);
            return ApiResponse<TicketDto>.SuccessResponse(dto!, "Ticket acknowledged successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error acknowledging ticket {TicketId}", ticketId);
            return ApiResponse<TicketDto>.FailResponse("An error occurred while acknowledging ticket");
        }
    }

    public async Task<ApiResponse<TicketDto>> StartTicketAsync(int ticketId, int startedBy)
    {
        try
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);
            if (ticket == null)
            {
                return ApiResponse<TicketDto>.FailResponse("Ticket not found");
            }

            if (ticket.Status != TicketStatuses.Acknowledged)
            {
                return ApiResponse<TicketDto>.FailResponse("Ticket must be acknowledged before starting work");
            }

            var oldStatus = ticket.Status;
            ticket.Status = TicketStatuses.InProgress;
            ticket.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await AddAuditTrailAsync(ticketId, AuditActions.StatusChanged, oldStatus, TicketStatuses.InProgress, "Work started", startedBy);

            var dto = await GetTicketByIdAsync(ticket.TicketId);
            return ApiResponse<TicketDto>.SuccessResponse(dto!, "Ticket work started");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting ticket {TicketId}", ticketId);
            return ApiResponse<TicketDto>.FailResponse("An error occurred");
        }
    }

    public async Task<ApiResponse<TicketDto>> ResolveTicketAsync(int ticketId, ResolveTicketRequest request, int resolvedBy)
    {
        try
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);
            if (ticket == null)
            {
                return ApiResponse<TicketDto>.FailResponse("Ticket not found");
            }

            if (!TicketStatuses.ActiveStatuses.Contains(ticket.Status))
            {
                return ApiResponse<TicketDto>.FailResponse("Ticket cannot be resolved in current status");
            }

            var oldStatus = ticket.Status;
            ticket.Status = TicketStatuses.Resolved;
            ticket.RootCause = request.RootCause;
            ticket.ResolutionSummary = request.ResolutionSummary;
            ticket.ResolvedOn = DateTime.UtcNow;
            ticket.ModifiedOn = DateTime.UtcNow;

            // Check SLA restore breach
            if (ticket.SLARestoreDue.HasValue && DateTime.UtcNow > ticket.SLARestoreDue.Value)
            {
                ticket.IsSLARestoreBreached = true;
                await AddAuditTrailAsync(ticketId, AuditActions.SLABreached, null, "Restore SLA Breached", null, resolvedBy);
            }

            await _context.SaveChangesAsync();

            await AddAuditTrailAsync(ticketId, AuditActions.Resolved, oldStatus, TicketStatuses.Resolved, request.ResolutionSummary, resolvedBy);

            // Notify via SignalR
            await _hubContext.Clients.All.SendAsync("TicketResolved", ticket.TicketNumber);

            _logger.LogInformation("Ticket {TicketId} resolved by {UserId}", ticketId, resolvedBy);

            var dto = await GetTicketByIdAsync(ticket.TicketId);
            return ApiResponse<TicketDto>.SuccessResponse(dto!, "Ticket resolved successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving ticket {TicketId}", ticketId);
            return ApiResponse<TicketDto>.FailResponse("An error occurred while resolving ticket");
        }
    }

    public async Task<ApiResponse<TicketDto>> VerifyTicketAsync(int ticketId, int verifiedBy)
    {
        try
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);
            if (ticket == null)
            {
                return ApiResponse<TicketDto>.FailResponse("Ticket not found");
            }

            if (ticket.Status != TicketStatuses.Resolved)
            {
                return ApiResponse<TicketDto>.FailResponse("Only resolved tickets can be verified");
            }

            var user = await _context.Users.FindAsync(verifiedBy);

            ticket.Status = TicketStatuses.Verified;
            ticket.VerifiedBy = user?.FullName;
            ticket.VerifiedOn = DateTime.UtcNow;
            ticket.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await AddAuditTrailAsync(ticketId, AuditActions.Verified, TicketStatuses.Resolved, TicketStatuses.Verified, null, verifiedBy);

            var dto = await GetTicketByIdAsync(ticket.TicketId);
            return ApiResponse<TicketDto>.SuccessResponse(dto!, "Ticket verified successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying ticket {TicketId}", ticketId);
            return ApiResponse<TicketDto>.FailResponse("An error occurred");
        }
    }

    public async Task<ApiResponse<TicketDto>> CloseTicketAsync(int ticketId, CloseTicketRequest request, int closedBy)
    {
        try
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);
            if (ticket == null)
            {
                return ApiResponse<TicketDto>.FailResponse("Ticket not found");
            }

            if (ticket.Status != TicketStatuses.Resolved && ticket.Status != TicketStatuses.Verified)
            {
                return ApiResponse<TicketDto>.FailResponse("Only resolved or verified tickets can be closed");
            }

            var oldStatus = ticket.Status;
            ticket.Status = TicketStatuses.Closed;
            ticket.ClosedOn = DateTime.UtcNow;
            ticket.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await AddAuditTrailAsync(ticketId, AuditActions.Closed, oldStatus, TicketStatuses.Closed, request.VerificationRemarks, closedBy);

            _logger.LogInformation("Ticket {TicketId} closed by {UserId}", ticketId, closedBy);

            var dto = await GetTicketByIdAsync(ticket.TicketId);
            return ApiResponse<TicketDto>.SuccessResponse(dto!, "Ticket closed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing ticket {TicketId}", ticketId);
            return ApiResponse<TicketDto>.FailResponse("An error occurred while closing ticket");
        }
    }

    public async Task<ApiResponse<TicketDto>> ReopenTicketAsync(int ticketId, int reopenedBy, string userRole, string reason)
    {
        try
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);
            if (ticket == null)
            {
                return ApiResponse<TicketDto>.FailResponse("Ticket not found");
            }

            // Authorization check
            bool isAuthorized = userRole == UserRoles.Admin ||
                                userRole == UserRoles.Supervisor ||
                                ticket.CreatedBy == reopenedBy;

            if (!isAuthorized)
            {
                return ApiResponse<TicketDto>.FailResponse("You are not authorized to reopen this ticket.");
            }

            var oldStatus = ticket.Status;
            
            // If there's an assignee, set to Assigned so they must acknowledge again
            // Otherwise set to Open for assignment
            string newStatus = ticket.AssignedTo.HasValue ? TicketStatuses.Assigned : TicketStatuses.Open;
            ticket.Status = newStatus;
            
            // Reset only the acknowledgment to enforce the re-acknowledgment workflow
            // Historical timestamps (ResolvedOn, ClosedOn, VerifiedBy, VerifiedOn) are preserved for traceability
            ticket.AcknowledgedOn = null;
            ticket.ModifiedOn = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await AddAuditTrailAsync(ticketId, AuditActions.Reopened, oldStatus, newStatus, reason, reopenedBy);

            // Notify via SignalR if assigned
            if (ticket.AssignedTo.HasValue)
            {
                await _hubContext.Clients.User(ticket.AssignedTo.Value.ToString()).SendAsync("TicketReopened", ticket.TicketNumber);
            }

            _logger.LogInformation("Ticket {TicketId} reopened by {UserId}. Status set to {Status}", ticketId, reopenedBy, newStatus);

            var dto = await GetTicketByIdAsync(ticket.TicketId);
            return ApiResponse<TicketDto>.SuccessResponse(dto!, "Ticket reopened successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reopening ticket {TicketId}", ticketId);
            return ApiResponse<TicketDto>.FailResponse("An error occurred");
        }
    }

    public async Task<List<AuditTrailDto>> GetTicketAuditTrailAsync(int ticketId)
    {
        return await _context.TicketAuditTrails
            .Where(a => a.TicketId == ticketId)
            .OrderByDescending(a => a.PerformedOn)
            .Select(a => new AuditTrailDto
            {
                AuditId = a.AuditId,
                TicketId = a.TicketId,
                Action = a.Action,
                OldValue = a.OldValue,
                NewValue = a.NewValue,
                Remarks = a.Remarks,
                PerformedBy = a.PerformedBy,
                PerformedByName = a.PerformedByName,
                PerformedOn = a.PerformedOn
            })
            .ToListAsync();
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync(int userId, string userRole)
    {
        var today = DateTime.UtcNow.Date;
        
        // Get user's assigned site(s) if not admin
        List<int>? userSiteIds = null;
        bool isAdmin = userRole == UserRoles.Admin;
        
        if (!isAdmin)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user != null && user.SiteId.HasValue)
            {
                userSiteIds = new List<int> { user.SiteId.Value };
            }
        }
        
        // Base query for tickets - filter by site for non-admins
        var ticketsQuery = _context.Tickets
            .Include(t => t.Asset)
            .AsQueryable();
            
        if (userSiteIds != null && userSiteIds.Count > 0)
        {
            ticketsQuery = ticketsQuery.Where(t => 
                t.Asset != null && userSiteIds.Contains(t.Asset.SiteId));
        }
        
        // Base query for assets
        var assetsQuery = _context.Assets.Where(a => a.IsActive);
        if (userSiteIds != null && userSiteIds.Count > 0)
        {
            assetsQuery = assetsQuery.Where(a => userSiteIds.Contains(a.SiteId));
        }
        
        // Base query for engineers
        var engineersQuery = _context.Users.Where(u => 
            u.IsActive && (u.Role == UserRoles.L1Engineer || u.Role == UserRoles.L2Engineer));
        if (userSiteIds != null && userSiteIds.Count > 0)
        {
            engineersQuery = engineersQuery.Where(u => u.SiteId.HasValue && userSiteIds.Contains(u.SiteId.Value));
        }

        var stats = new DashboardStatsDto
        {
            TotalTickets = await ticketsQuery.CountAsync(),
            OpenTickets = await ticketsQuery.CountAsync(t => t.Status == TicketStatuses.Open || t.Status == TicketStatuses.Assigned),
            InProgressTickets = await ticketsQuery.CountAsync(t => t.Status == TicketStatuses.InProgress || t.Status == TicketStatuses.Acknowledged),
            ResolvedToday = await ticketsQuery.CountAsync(t => t.ResolvedOn.HasValue && t.ResolvedOn.Value.Date == today),
            SLABreached = await ticketsQuery.CountAsync(t => (t.IsSLAResponseBreached || t.IsSLARestoreBreached) && TicketStatuses.ActiveStatuses.Contains(t.Status)),
            TotalAssets = await assetsQuery.CountAsync(),
            OfflineAssets = await assetsQuery.CountAsync(a => a.Status == AssetStatuses.Offline),
            AvailableEngineers = await engineersQuery.CountAsync()
        };

        // SLA at risk (within 30 minutes of breach)
        var riskThreshold = DateTime.UtcNow.AddMinutes(30);
        stats.SLAAtRisk = await ticketsQuery.CountAsync(t =>
            TicketStatuses.ActiveStatuses.Contains(t.Status) &&
            !t.IsSLARestoreBreached &&
            t.SLARestoreDue.HasValue &&
            t.SLARestoreDue.Value <= riskThreshold &&
            t.SLARestoreDue.Value > DateTime.UtcNow);

        // SLA Compliance
        var closedTickets = await ticketsQuery.CountAsync(t => t.Status == TicketStatuses.Closed);
        var breachedClosed = await ticketsQuery.CountAsync(t => t.Status == TicketStatuses.Closed && (t.IsSLAResponseBreached || t.IsSLARestoreBreached));
        stats.SLACompliancePercent = closedTickets > 0 ? Math.Round((double)(closedTickets - breachedClosed) / closedTickets * 100, 1) : 100;

        // Tickets by Priority
        stats.TicketsByPriority = await ticketsQuery
            .Where(t => TicketStatuses.ActiveStatuses.Contains(t.Status))
            .GroupBy(t => t.Priority)
            .Select(g => new TicketsByPriorityDto { Priority = g.Key, Count = g.Count() })
            .ToListAsync();

        // Tickets by Category
        stats.TicketsByCategory = await ticketsQuery
            .Where(t => TicketStatuses.ActiveStatuses.Contains(t.Status))
            .GroupBy(t => t.Category)
            .Select(g => new TicketsByCategoryDto { Category = g.Key, Count = g.Count() })
            .ToListAsync();

        // Tickets by Status
        stats.TicketsByStatus = await ticketsQuery
            .GroupBy(t => t.Status)
            .Select(g => new TicketsByStatusDto { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        return stats;
    }


    // Helper methods
    private async Task<string> GenerateTicketNumberAsync()
    {
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var count = await _context.Tickets
            .CountAsync(t => t.TicketNumber.StartsWith($"TKT-{today}"));
        return $"TKT-{today}-{(count + 1):D4}";
    }

    private async Task AddAuditTrailAsync(int ticketId, string action, string? oldValue, string? newValue, string? remarks, int performedBy)
    {
        var user = await _context.Users.FindAsync(performedBy);

        var audit = new TicketAuditTrail
        {
            TicketId = ticketId,
            Action = action,
            OldValue = oldValue,
            NewValue = newValue,
            Remarks = remarks,
            PerformedBy = performedBy,
            PerformedByName = user?.FullName ?? "System",
            PerformedOn = DateTime.UtcNow
        };

        _context.TicketAuditTrails.Add(audit);
        await _context.SaveChangesAsync();
    }

    private static string GetSLAStatus(TicketMaster ticket)
    {
        if (ticket.IsSLAResponseBreached || ticket.IsSLARestoreBreached)
            return "Breached";

        if (!ticket.SLARestoreDue.HasValue)
            return "N/A";

        var remaining = ticket.SLARestoreDue.Value - DateTime.UtcNow;
        if (remaining.TotalMinutes <= 30)
            return "AtRisk";

        return "OnTrack";
    }
}
