using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UCCTicketing.API.Entities;

public class TicketMaster
{
    [Key]
    public int TicketId { get; set; }

    [Required]
    [MaxLength(20)]
    public string TicketNumber { get; set; } = string.Empty; // Auto-generated: TKT-YYYYMMDD-XXXX

    public int? AssetId { get; set; }

    [ForeignKey(nameof(AssetId))]
    public virtual AssetMaster? Asset { get; set; }

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty; // Hardware, Software, Network, Power, Other

    [MaxLength(100)]
    public string? SubCategory { get; set; }

    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Required]
    [MaxLength(20)]
    public string Priority { get; set; } = "P3"; // P1-Critical, P2-High, P3-Medium, P4-Low

    public int PriorityScore { get; set; } = 0; // Calculated: Impact × Urgency × Criticality

    public int Impact { get; set; } = 3; // 1-5 scale

    public int Urgency { get; set; } = 3; // 1-5 scale

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = TicketStatuses.Open;

    [Required]
    [MaxLength(50)]
    public string Source { get; set; } = "Manual"; // Manual, VMS, NMS, IoT

    public int CreatedBy { get; set; }

    [ForeignKey(nameof(CreatedBy))]
    public virtual UserMaster Creator { get; set; } = null!;

    public int? AssignedTo { get; set; }

    [ForeignKey(nameof(AssignedTo))]
    public virtual UserMaster? Assignee { get; set; }

    public int? SLAPolicyId { get; set; }

    [ForeignKey(nameof(SLAPolicyId))]
    public virtual SLAPolicy? SLAPolicy { get; set; }

    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    public DateTime? AssignedOn { get; set; }

    public DateTime? AcknowledgedOn { get; set; }

    public DateTime? ResolvedOn { get; set; }

    public DateTime? ClosedOn { get; set; }

    // SLA Tracking
    public DateTime? SLAResponseDue { get; set; }

    public DateTime? SLARestoreDue { get; set; }

    public bool IsSLAResponseBreached { get; set; } = false;

    public bool IsSLARestoreBreached { get; set; } = false;

    public int EscalationLevel { get; set; } = 0; // 0 = Not escalated, 1 = Level 1, 2 = Level 2

    // Resolution Details
    [MaxLength(500)]
    public string? RootCause { get; set; }

    [MaxLength(2000)]
    public string? ResolutionSummary { get; set; }

    [MaxLength(100)]
    public string? VerifiedBy { get; set; }

    public DateTime? VerifiedOn { get; set; }

    public bool RequiresVerification { get; set; } = true;

    // Metadata
    [MaxLength(500)]
    public string? Tags { get; set; } // Comma-separated tags for filtering

    public DateTime? ModifiedOn { get; set; }

    // Navigation properties
    public virtual ICollection<TicketAuditTrail> AuditTrails { get; set; } = new List<TicketAuditTrail>();
    public virtual ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();
    public virtual ICollection<TicketAttachment> Attachments { get; set; } = new List<TicketAttachment>();
}

public static class TicketStatuses
{
    public const string Open = "Open";
    public const string Assigned = "Assigned";
    public const string Acknowledged = "Acknowledged";
    public const string InProgress = "InProgress";
    public const string OnHold = "OnHold";
    public const string Resolved = "Resolved";
    public const string Verified = "Verified";
    public const string Closed = "Closed";
    public const string Cancelled = "Cancelled";

    public static readonly string[] AllStatuses = { Open, Assigned, Acknowledged, InProgress, OnHold, Resolved, Verified, Closed, Cancelled };
    public static readonly string[] ActiveStatuses = { Open, Assigned, Acknowledged, InProgress, OnHold };
}

public static class TicketPriorities
{
    public const string P1Critical = "P1";
    public const string P2High = "P2";
    public const string P3Medium = "P3";
    public const string P4Low = "P4";

    public static readonly string[] AllPriorities = { P1Critical, P2High, P3Medium, P4Low };

    public static string CalculatePriority(int priorityScore)
    {
        return priorityScore switch
        {
            >= 50 => P1Critical,
            >= 25 => P2High,
            >= 10 => P3Medium,
            _ => P4Low
        };
    }
}

public static class TicketCategories
{
    public const string Hardware = "Hardware";
    public const string Software = "Software";
    public const string Network = "Network";
    public const string Power = "Power";
    public const string Connectivity = "Connectivity";
    public const string Other = "Other";

    public static readonly string[] AllCategories = { Hardware, Software, Network, Power, Connectivity, Other };
}
