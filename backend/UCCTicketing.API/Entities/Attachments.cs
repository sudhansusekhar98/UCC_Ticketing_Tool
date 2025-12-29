using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UCCTicketing.API.Entities;

// WorkOrderAttachment stays here, TicketAttachment moved to TicketAttachment.cs

public class WorkOrderAttachment
{
    [Key]
    public int AttachmentId { get; set; }

    [Required]
    public int WorkOrderId { get; set; }

    [ForeignKey(nameof(WorkOrderId))]
    public virtual WorkOrder WorkOrder { get; set; } = null!;

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ContentType { get; set; }

    public long FileSize { get; set; }

    [MaxLength(50)]
    public string AttachmentType { get; set; } = "Evidence"; // Evidence, Before, After, Document

    [MaxLength(500)]
    public string? Description { get; set; }

    // Geo-tagging for field evidence
    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    public DateTime? CapturedOn { get; set; }

    public int UploadedBy { get; set; }

    public DateTime UploadedOn { get; set; } = DateTime.UtcNow;
}
