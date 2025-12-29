using System.ComponentModel.DataAnnotations;

namespace UCCTicketing.API.DTOs;

// ============ Site DTOs ============

public class SiteDto
{
    public int SiteId { get; set; }
    public string SiteName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Zone { get; set; }
    public string? Ward { get; set; }
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedOn { get; set; }
    public int AssetCount { get; set; }
    public int EngineerCount { get; set; }
}

public class CreateSiteRequest
{
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
}

public class UpdateSiteRequest : CreateSiteRequest
{
    public bool IsActive { get; set; } = true;
}

// ============ Asset DTOs ============

public class AssetDto
{
    public int AssetId { get; set; }
    public string AssetCode { get; set; } = string.Empty;
    public string AssetType { get; set; } = string.Empty;

    public string? Make { get; set; }
    public string? Model { get; set; }

    public string? SerialNumber { get; set; }
    public string? ManagementIP { get; set; }

    public string? MAC { get; set; }
    public int SiteId { get; set; }
    public string SiteName { get; set; } = string.Empty;
    public string? LocationDescription { get; set; }
    public string? LocationName { get; set; }
    public string? DeviceType { get; set; }
    public string? UsedFor { get; set; }
    public int Criticality { get; set; }
    public string CriticalityLabel { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? InstallationDate { get; set; }
    public DateTime? WarrantyEndDate { get; set; }
    public string? VmsReferenceId { get; set; }
    public string? NmsReferenceId { get; set; }
    public string? UserName { get; set; }
    public string? Remark { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedOn { get; set; }
    public int OpenTicketCount { get; set; }
}

public class CreateAssetRequest
{
    [Required]
    [MaxLength(50)]
    public string AssetCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string AssetType { get; set; } = string.Empty;



    [MaxLength(100)]
    public string? Make { get; set; }

    [MaxLength(150)]
    public string? Model { get; set; }



    [MaxLength(100)]
    public string? SerialNumber { get; set; }

    [MaxLength(50)]
    public string? ManagementIP { get; set; }



    [MaxLength(50)]
    public string? MAC { get; set; }

    [Required]
    public int SiteId { get; set; }

    [MaxLength(200)]
    public string? LocationDescription { get; set; }

    [MaxLength(150)]
    public string? LocationName { get; set; }

    [MaxLength(100)]
    public string? DeviceType { get; set; }

    [MaxLength(150)]
    public string? UsedFor { get; set; }

    [Range(1, 3)]
    public int Criticality { get; set; } = 2;

    [MaxLength(50)]
    public string Status { get; set; } = "Operational";

    public DateTime? InstallationDate { get; set; }

    public DateTime? WarrantyEndDate { get; set; }

    [MaxLength(100)]
    public string? VmsReferenceId { get; set; }

    [MaxLength(100)]
    public string? NmsReferenceId { get; set; }

    [MaxLength(100)]
    public string? UserName { get; set; }

    [MaxLength(255)]
    public string? Password { get; set; }

    [MaxLength(500)]
    public string? Remark { get; set; }
}

public class UpdateAssetRequest : CreateAssetRequest
{
    public bool IsActive { get; set; } = true;
}

