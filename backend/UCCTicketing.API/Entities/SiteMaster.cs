using System.ComponentModel.DataAnnotations;

namespace UCCTicketing.API.Entities;

public class SiteMaster
{
    [Key]
    public int SiteId { get; set; }

    [Required]
    [MaxLength(100)]
    public string SiteName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Zone { get; set; }

    [MaxLength(100)]
    public string? Ward { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    [MaxLength(100)]
    public string? ContactPerson { get; set; }

    [MaxLength(20)]
    public string? ContactPhone { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    public DateTime? ModifiedOn { get; set; }

    // Navigation properties
    public virtual ICollection<AssetMaster> Assets { get; set; } = new List<AssetMaster>();
    public virtual ICollection<UserMaster> AssignedEngineers { get; set; } = new List<UserMaster>();
}
