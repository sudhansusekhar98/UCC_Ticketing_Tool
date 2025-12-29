using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UCCTicketing.API.Entities;

/// <summary>
/// System settings entity for storing application configuration
/// </summary>
[Table("SystemSettings")]
public class SystemSetting
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int SettingId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string SettingKey { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? SettingValue { get; set; }

    [MaxLength(50)]
    public string DataType { get; set; } = "string"; // string, int, bool, json

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    public DateTime? ModifiedOn { get; set; }

    public int? ModifiedBy { get; set; }

    [ForeignKey(nameof(ModifiedBy))]
    public virtual UserMaster? ModifiedByUser { get; set; }
}

/// <summary>
/// Static class defining setting categories
/// </summary>
public static class SettingCategories
{
    public const string General = "General";
    public const string Notifications = "Notifications";
    public const string SLA = "SLA";
    public const string Email = "Email";
    public const string Security = "Security";
    public const string Appearance = "Appearance";
}

/// <summary>
/// Static class defining setting keys
/// </summary>
public static class SettingKeys
{
    // General Settings
    public const string CompanyName = "CompanyName";
    public const string CompanyAddress = "CompanyAddress";
    public const string Timezone = "Timezone";
    public const string DateFormat = "DateFormat";
    public const string TimeFormat = "TimeFormat";
    public const string Language = "Language";
    public const string AutoRefreshInterval = "AutoRefreshInterval";

    // Notification Settings
    public const string EmailNotifications = "EmailNotifications";
    public const string TicketCreated = "TicketCreated";
    public const string TicketAssigned = "TicketAssigned";
    public const string TicketUpdated = "TicketUpdated";
    public const string TicketResolved = "TicketResolved";
    public const string SLAWarning = "SLAWarning";
    public const string SLABreach = "SLABreach";
    public const string DailyDigest = "DailyDigest";

    // Email Settings
    public const string SmtpServer = "SmtpServer";
    public const string SmtpPort = "SmtpPort";
    public const string SmtpUsername = "SmtpUsername";
    public const string SmtpPassword = "SmtpPassword";
    public const string SmtpUseTLS = "SmtpUseTLS";
    public const string SenderName = "SenderName";
    public const string SenderEmail = "SenderEmail";
    public const string EmailFooter = "EmailFooter";

    // Security Settings
    public const string PasswordMinLength = "PasswordMinLength";
    public const string PasswordRequireUppercase = "PasswordRequireUppercase";
    public const string PasswordRequireLowercase = "PasswordRequireLowercase";
    public const string PasswordRequireNumber = "PasswordRequireNumber";
    public const string PasswordRequireSpecial = "PasswordRequireSpecial";
    public const string SessionTimeout = "SessionTimeout";
    public const string MaxLoginAttempts = "MaxLoginAttempts";
    public const string LockoutDuration = "LockoutDuration";
    public const string EnableTwoFactor = "EnableTwoFactor";
    public const string ForcePasswordChange = "ForcePasswordChange";

    // Appearance Settings
    public const string Theme = "Theme";
    public const string CompactMode = "CompactMode";
    public const string ShowWelcomeMessage = "ShowWelcomeMessage";
    public const string DashboardLayout = "DashboardLayout";
}
