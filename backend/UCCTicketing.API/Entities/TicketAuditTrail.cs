using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UCCTicketing.API.Entities;

public class TicketAuditTrail
{
    [Key]
    public int AuditId { get; set; }

    [Required]
    public int TicketId { get; set; }

    [ForeignKey(nameof(TicketId))]
    public virtual TicketMaster Ticket { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string Action { get; set; } = string.Empty; // Created, StatusChanged, Assigned, Escalated, etc.

    [MaxLength(500)]
    public string? OldValue { get; set; }

    [MaxLength(500)]
    public string? NewValue { get; set; }

    [MaxLength(1000)]
    public string? Remarks { get; set; }

    [Required]
    public int PerformedBy { get; set; }

    [MaxLength(100)]
    public string PerformedByName { get; set; } = string.Empty;

    public DateTime PerformedOn { get; set; } = DateTime.UtcNow;

    [MaxLength(50)]
    public string? IPAddress { get; set; }
}

public static class AuditActions
{
    public const string Created = "Created";
    public const string StatusChanged = "StatusChanged";
    public const string Assigned = "Assigned";
    public const string Acknowledged = "Acknowledged";
    public const string PriorityChanged = "PriorityChanged";
    public const string Escalated = "Escalated";
    public const string Resolved = "Resolved";
    public const string Verified = "Verified";
    public const string Closed = "Closed";
    public const string Reopened = "Reopened";
    public const string CommentAdded = "CommentAdded";
    public const string AttachmentAdded = "AttachmentAdded";
    public const string SLABreached = "SLABreached";
}
