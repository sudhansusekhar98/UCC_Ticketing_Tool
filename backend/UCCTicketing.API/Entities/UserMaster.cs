using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UCCTicketing.API.Entities;

public class UserMaster
{
    [Key]
    public int UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Role { get; set; } = string.Empty; // Dispatcher, L1Engineer, L2Engineer, Supervisor, Admin, ClientViewer

    [MaxLength(20)]
    public string? MobileNumber { get; set; }

    [MaxLength(100)]
    public string? Designation { get; set; }

    public int? SiteId { get; set; } // Assigned site for engineers

    [ForeignKey(nameof(SiteId))]
    public virtual SiteMaster? Site { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    public DateTime? LastLoginOn { get; set; }

    public string? RefreshToken { get; set; }

    public DateTime? RefreshTokenExpiry { get; set; }

    // Navigation properties
    public virtual ICollection<TicketMaster> AssignedTickets { get; set; } = new List<TicketMaster>();
    public virtual ICollection<TicketMaster> CreatedTickets { get; set; } = new List<TicketMaster>();
    public virtual ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();
}

public static class UserRoles
{
    public const string Dispatcher = "Dispatcher";
    public const string L1Engineer = "L1Engineer";
    public const string L2Engineer = "L2Engineer";
    public const string Supervisor = "Supervisor";
    public const string Admin = "Admin";
    public const string ClientViewer = "ClientViewer";

    public static readonly string[] AllRoles = { Dispatcher, L1Engineer, L2Engineer, Supervisor, Admin, ClientViewer };
}
