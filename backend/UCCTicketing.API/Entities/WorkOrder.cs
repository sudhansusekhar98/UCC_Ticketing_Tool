using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UCCTicketing.API.Entities;

public class WorkOrder
{
    [Key]
    public int WorkOrderId { get; set; }

    [Required]
    [MaxLength(20)]
    public string WorkOrderNumber { get; set; } = string.Empty; // Auto-generated: WO-YYYYMMDD-XXXX

    [Required]
    public int TicketId { get; set; }

    [ForeignKey(nameof(TicketId))]
    public virtual TicketMaster Ticket { get; set; } = null!;

    [Required]
    public int EngineerId { get; set; }

    [ForeignKey(nameof(EngineerId))]
    public virtual UserMaster Engineer { get; set; } = null!;

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = WorkOrderStatuses.Pending;

    [MaxLength(50)]
    public string WorkOrderType { get; set; } = "Corrective"; // Corrective, Preventive, Inspection

    // Checklist (JSON stored)
    [Column(TypeName = "nvarchar(max)")]
    public string? ChecklistJson { get; set; }

    // Parts used (JSON stored)
    [Column(TypeName = "nvarchar(max)")]
    public string? PartsUsedJson { get; set; }

    // Timing
    public DateTime? ScheduledDate { get; set; }

    public DateTime? StartedOn { get; set; }

    public DateTime? CompletedOn { get; set; }

    // Location tracking
    public double? StartLatitude { get; set; }

    public double? StartLongitude { get; set; }

    public double? EndLatitude { get; set; }

    public double? EndLongitude { get; set; }

    // Work details
    [MaxLength(2000)]
    public string? WorkPerformed { get; set; }

    [MaxLength(2000)]
    public string? Remarks { get; set; }

    [MaxLength(1000)]
    public string? Observations { get; set; }

    // Approval
    public bool RequiresApproval { get; set; } = false;

    public int? ApprovedBy { get; set; }

    public DateTime? ApprovedOn { get; set; }

    [MaxLength(500)]
    public string? ApprovalRemarks { get; set; }

    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    public DateTime? ModifiedOn { get; set; }

    // Navigation
    public virtual ICollection<WorkOrderAttachment> Attachments { get; set; } = new List<WorkOrderAttachment>();
}

public static class WorkOrderStatuses
{
    public const string Pending = "Pending";
    public const string Accepted = "Accepted";
    public const string InTransit = "InTransit";
    public const string AtSite = "AtSite";
    public const string InProgress = "InProgress";
    public const string Completed = "Completed";
    public const string PendingApproval = "PendingApproval";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";

    public static readonly string[] AllStatuses = { Pending, Accepted, InTransit, AtSite, InProgress, Completed, PendingApproval, Approved, Rejected };
}
