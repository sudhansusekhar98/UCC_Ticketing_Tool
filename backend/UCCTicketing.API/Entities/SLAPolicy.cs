using System.ComponentModel.DataAnnotations;

namespace UCCTicketing.API.Entities;

public class SLAPolicy
{
    [Key]
    public int PolicyId { get; set; }

    [Required]
    [MaxLength(100)]
    public string PolicyName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Priority { get; set; } = string.Empty; // P1, P2, P3, P4

    public int ResponseTimeMinutes { get; set; } // Time to first response

    public int RestoreTimeMinutes { get; set; } // Time to resolution

    public int EscalationLevel1Minutes { get; set; } // Time before L1 escalation

    public int EscalationLevel2Minutes { get; set; } // Time before L2 escalation

    [MaxLength(200)]
    public string? EscalationL1Emails { get; set; } // Comma-separated emails

    [MaxLength(200)]
    public string? EscalationL2Emails { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    public DateTime? ModifiedOn { get; set; }

    // Navigation
    public virtual ICollection<TicketMaster> Tickets { get; set; } = new List<TicketMaster>();
}
