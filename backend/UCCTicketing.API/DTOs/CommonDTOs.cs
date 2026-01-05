namespace UCCTicketing.API.DTOs;

// ============ Common Response DTOs ============

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<string>? Errors { get; set; }

    public static ApiResponse<T> SuccessResponse(T data, string message = "Success")
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data
        };
    }

    public static ApiResponse<T> FailResponse(string message, List<string>? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Errors = errors
        };
    }

    public static ApiResponse<T> FailResponse(string message, T data)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Data = data
        };
    }
}

public class PagedResponse<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}

// ============ Dashboard DTOs ============

public class DashboardStatsDto
{
    public int TotalTickets { get; set; }
    public int OpenTickets { get; set; }
    public int InProgressTickets { get; set; }
    public int ResolvedToday { get; set; }
    public int SLABreached { get; set; }
    public int SLAAtRisk { get; set; }
    public double SLACompliancePercent { get; set; }
    public int TotalAssets { get; set; }
    public int OfflineAssets { get; set; }
    public int AvailableEngineers { get; set; }
    public List<TicketsByPriorityDto> TicketsByPriority { get; set; } = new();
    public List<TicketsByCategoryDto> TicketsByCategory { get; set; } = new();
    public List<TicketsByStatusDto> TicketsByStatus { get; set; } = new();
}

public class TicketsByPriorityDto
{
    public string Priority { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TicketsByCategoryDto
{
    public string Category { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TicketsByStatusDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}

// ============ SLA Policy DTOs ============

public class SLAPolicyDto
{
    public int PolicyId { get; set; }
    public string PolicyName { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public int ResponseTimeMinutes { get; set; }
    public int RestoreTimeMinutes { get; set; }
    public int EscalationLevel1Minutes { get; set; }
    public int EscalationLevel2Minutes { get; set; }
    public string? EscalationL1Emails { get; set; }
    public string? EscalationL2Emails { get; set; }
    public bool IsActive { get; set; }
}

// ============ Work Order DTOs ============

public class WorkOrderDto
{
    public int WorkOrderId { get; set; }
    public string WorkOrderNumber { get; set; } = string.Empty;
    public int TicketId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public int EngineerId { get; set; }
    public string EngineerName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string WorkOrderType { get; set; } = string.Empty;
    public string? ChecklistJson { get; set; }
    public string? PartsUsedJson { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public DateTime? StartedOn { get; set; }
    public DateTime? CompletedOn { get; set; }
    public string? WorkPerformed { get; set; }
    public string? Remarks { get; set; }
    public string? Observations { get; set; }
    public bool RequiresApproval { get; set; }
    public DateTime CreatedOn { get; set; }
    public int AttachmentCount { get; set; }
}

public class CreateWorkOrderRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    public int TicketId { get; set; }

    [System.ComponentModel.DataAnnotations.Required]
    public int EngineerId { get; set; }

    public string WorkOrderType { get; set; } = "Corrective";

    public DateTime? ScheduledDate { get; set; }

    public string? ChecklistJson { get; set; }

    public bool RequiresApproval { get; set; } = false;
}

public class UpdateWorkOrderRequest
{
    public string? ChecklistJson { get; set; }
    public string? PartsUsedJson { get; set; }
    public string? WorkPerformed { get; set; }
    public string? Remarks { get; set; }
    public string? Observations { get; set; }
}

public class CompleteWorkOrderRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    public string WorkPerformed { get; set; } = string.Empty;

    public string? PartsUsedJson { get; set; }

    public string? Remarks { get; set; }

    public double? EndLatitude { get; set; }

    public double? EndLongitude { get; set; }
}

// ============ Dropdown Options ============

public class UserContactDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? MobileNumber { get; set; }
}

public class DropdownOption
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class DropdownOptionsDto
{
    public List<DropdownOption> Statuses { get; set; } = new();
    public List<DropdownOption> Priorities { get; set; } = new();
    public List<DropdownOption> Categories { get; set; } = new();
    public List<DropdownOption> AssetTypes { get; set; } = new();
    public List<DropdownOption> Roles { get; set; } = new();
}

// ============ Bulk Import DTOs ============

public class BulkImportResult
{
    public int TotalProcessed { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> Errors { get; set; } = new();
}
