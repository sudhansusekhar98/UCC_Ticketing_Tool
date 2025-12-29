using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UCCTicketing.API.Entities;

public class TicketActivity
{
    [Key]
    public int ActivityId { get; set; }
    
    [Required]
    public int TicketId { get; set; }
    
    [Required]
    public int UserId { get; set; }
    
    [Required]
    [StringLength(50)]
    public string ActivityType { get; set; } = "Comment"; // Comment, StatusChange, Assignment, Escalation, Resolution, Attachment
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    public bool IsInternal { get; set; } = false; // Internal notes not visible to clients
    
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("TicketId")]
    public virtual TicketMaster? Ticket { get; set; }
    
    [ForeignKey("UserId")]
    public virtual UserMaster? User { get; set; }
    
    public virtual ICollection<TicketAttachment> Attachments { get; set; } = new List<TicketAttachment>();
}
