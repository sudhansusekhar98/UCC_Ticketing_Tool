using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UCCTicketing.API.Entities;

public class TicketAttachment
{
    [Key]
    public int AttachmentId { get; set; }
    
    public int? ActivityId { get; set; }
    
    public int? TicketId { get; set; }
    
    [Required]
    public int UploadedBy { get; set; }
    
    [Required]
    [StringLength(255)]
    public string FileName { get; set; } = string.Empty;
    
    [Required]
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty;
    
    public long FileSize { get; set; }
    
    [Required]
    [StringLength(50)]
    public string StorageType { get; set; } = "Database"; // Database, Cloudinary
    
    [Required]
    [StringLength(500)]
    public string FilePath { get; set; } = string.Empty; // Path for local storage or URL
    
    [Required]
    [StringLength(50)]
    public string AttachmentType { get; set; } = "document"; // image, document
    
    [StringLength(500)]
    public string? Description { get; set; }
    
    // For Cloudinary storage
    [StringLength(500)]
    public string? CloudinaryUrl { get; set; }
    
    [StringLength(100)]
    public string? CloudinaryPublicId { get; set; }
    
    // For Database storage (documents)
    public byte[]? FileData { get; set; }
    
    public DateTime UploadedOn { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("ActivityId")]
    public virtual TicketActivity? Activity { get; set; }
    
    [ForeignKey("TicketId")]
    public virtual TicketMaster? Ticket { get; set; }
    
    [ForeignKey("UploadedBy")]
    public virtual UserMaster? Uploader { get; set; }
}
