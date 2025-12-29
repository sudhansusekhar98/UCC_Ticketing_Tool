using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UCCTicketing.API.Entities;

public class AssetMaster
{
    [Key]
    public int AssetId { get; set; }

    [Required]
    [MaxLength(50)]
    public string AssetCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string AssetType { get; set; } = string.Empty; // Camera, NVR, Switch, Router, Server




    [MaxLength(100)]
    public string? SerialNumber { get; set; }

    [MaxLength(50)]
    public string? MAC { get; set; }

    [Required]
    public int SiteId { get; set; }

    [ForeignKey(nameof(SiteId))]
    public virtual SiteMaster Site { get; set; } = null!;

    [MaxLength(200)]
    public string? LocationDescription { get; set; } // e.g., "Building A, Floor 2, Entrance"

    [Required]
    public int Criticality { get; set; } = 2; // 1 = Low, 2 = Medium, 3 = High

    [MaxLength(50)]
    public string Status { get; set; } = "Operational"; // Operational, Degraded, Offline, Maintenance

    public DateTime? InstallationDate { get; set; }

    public DateTime? WarrantyEndDate { get; set; }

    [MaxLength(100)]
    public string? VmsReferenceId { get; set; } // Reference ID in VMS system (Genetec/Milestone)

    [MaxLength(100)]
    public string? NmsReferenceId { get; set; } // Reference ID in NMS system (Zabbix/SNMP)

    public bool IsActive { get; set; } = true;

    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    public DateTime? ModifiedOn { get; set; }

    // ============ NEW COLUMNS ============

    [MaxLength(100)]
    public string? Make { get; set; }

    [MaxLength(150)]
    public string? Model { get; set; }

    [MaxLength(50)]
    public string? ManagementIP { get; set; }


    [MaxLength(150)]
    public string? LocationName { get; set; }

    [MaxLength(100)]
    public string? DeviceType { get; set; }

    [MaxLength(150)]
    public string? UsedFor { get; set; }

    [MaxLength(100)]
    public string? UserName { get; set; }

    [MaxLength(255)]
    public string? Password { get; set; } // Should be encrypted in production

    [MaxLength(500)]
    public string? Remark { get; set; }

    // Navigation properties
    public virtual ICollection<TicketMaster> Tickets { get; set; } = new List<TicketMaster>();
}

public static class AssetTypes
{
    public const string Camera = "Camera";
    public const string NVR = "NVR";
    public const string Switch = "Switch";
    public const string Router = "Router";
    public const string Server = "Server";
    public const string Other = "Other";

    public static readonly string[] AllTypes = { Camera, NVR, Switch, Router, Server, Other };
}

public static class AssetStatuses
{
    public const string Operational = "Operational";
    public const string Degraded = "Degraded";
    public const string Offline = "Offline";
    public const string Maintenance = "Maintenance";

    public static readonly string[] AllStatuses = { Operational, Degraded, Offline, Maintenance };
}
