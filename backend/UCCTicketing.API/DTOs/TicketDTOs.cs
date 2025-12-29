using System.ComponentModel.DataAnnotations;

namespace UCCTicketing.API.DTOs;

// ============ Ticket DTOs ============

public class TicketDto
{
    public int TicketId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public int? AssetId { get; set; }
    public string? AssetCode { get; set; }
    public string? AssetType { get; set; }
    public string? SiteName { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? SubCategory { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Priority { get; set; } = string.Empty;
    public int PriorityScore { get; set; }
    public int Impact { get; set; }
    public int Urgency { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public int CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public int? AssignedTo { get; set; }
    public string? AssignedToName { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? AssignedOn { get; set; }
    public DateTime? AcknowledgedOn { get; set; }
    public DateTime? ResolvedOn { get; set; }
    public DateTime? ClosedOn { get; set; }
    public DateTime? SLAResponseDue { get; set; }
    public DateTime? SLARestoreDue { get; set; }
    public bool IsSLAResponseBreached { get; set; }
    public bool IsSLARestoreBreached { get; set; }
    public int EscalationLevel { get; set; }
    public string? RootCause { get; set; }
    public string? ResolutionSummary { get; set; }
    public string? Tags { get; set; }
    public string SLAStatus { get; set; } = string.Empty; // OnTrack, AtRisk, Breached
    public int AttachmentCount { get; set; }
    public int WorkOrderCount { get; set; }
}

public class TicketListDto
{
    public int TicketId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public string? AssetCode { get; set; }
    public string? SiteName { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AssignedToName { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? SLARestoreDue { get; set; }
    public bool IsSLABreached { get; set; }
    public string SLAStatus { get; set; } = string.Empty;
}

public class CreateTicketRequest
{
    public int? AssetId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? SubCategory { get; set; }

    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Range(1, 5)]
    public int Impact { get; set; } = 3;

    [Range(1, 5)]
    public int Urgency { get; set; } = 3;

    public int? AssignedTo { get; set; }

    [MaxLength(500)]
    public string? Tags { get; set; }
}

public class UpdateTicketRequest
{
    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? SubCategory { get; set; }

    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Range(1, 5)]
    public int Impact { get; set; }

    [Range(1, 5)]
    public int Urgency { get; set; }

    [MaxLength(500)]
    public string? Tags { get; set; }
}

public class AssignTicketRequest
{
    [Required]
    public int AssignedTo { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}

public class ResolveTicketRequest
{
    [Required]
    [MaxLength(500)]
    public string RootCause { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string ResolutionSummary { get; set; } = string.Empty;
}

public class CloseTicketRequest
{
    [MaxLength(500)]
    public string? VerificationRemarks { get; set; }
}

// ============ Ticket Filter ============

public class TicketFilterRequest
{
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? Category { get; set; }
    public int? AssignedTo { get; set; }
    public int? SiteId { get; set; }
    public int? AssetId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public bool? IsSLABreached { get; set; }
    public string? SearchTerm { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string SortBy { get; set; } = "CreatedOn";
    public bool SortDescending { get; set; } = true;
}

// ============ Audit Trail DTOs ============

public class AuditTrailDto
{
    public int AuditId { get; set; }
    public int TicketId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Remarks { get; set; }
    public int PerformedBy { get; set; }
    public string PerformedByName { get; set; } = string.Empty;
    public DateTime PerformedOn { get; set; }
}
