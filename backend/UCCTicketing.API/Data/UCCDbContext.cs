using Microsoft.EntityFrameworkCore;
using UCCTicketing.API.Entities;

namespace UCCTicketing.API.Data;

public class UCCDbContext : DbContext
{
    public UCCDbContext(DbContextOptions<UCCDbContext> options) : base(options)
    {
    }

    public DbSet<UserMaster> Users { get; set; }
    public DbSet<SiteMaster> Sites { get; set; }
    public DbSet<AssetMaster> Assets { get; set; }
    public DbSet<TicketMaster> Tickets { get; set; }
    public DbSet<TicketAuditTrail> TicketAuditTrails { get; set; }
    public DbSet<TicketActivity> TicketActivities { get; set; }
    public DbSet<SLAPolicy> SLAPolicies { get; set; }
    public DbSet<WorkOrder> WorkOrders { get; set; }
    public DbSet<TicketAttachment> TicketAttachments { get; set; }
    public DbSet<WorkOrderAttachment> WorkOrderAttachments { get; set; }
    public DbSet<SystemSetting> SystemSettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<UserMaster>(entity =>
        {
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();

            entity.HasOne(e => e.Site)
                .WithMany(s => s.AssignedEngineers)
                .HasForeignKey(e => e.SiteId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Site configuration
        modelBuilder.Entity<SiteMaster>(entity =>
        {
            entity.HasIndex(e => e.SiteName);
            entity.HasIndex(e => e.City);
        });

        // Asset configuration
        modelBuilder.Entity<AssetMaster>(entity =>
        {
            entity.HasIndex(e => e.AssetCode).IsUnique();
            entity.HasIndex(e => e.ManagementIP);
            entity.HasIndex(e => e.SerialNumber);

            entity.HasOne(e => e.Site)
                .WithMany(s => s.Assets)
                .HasForeignKey(e => e.SiteId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Ticket configuration
        modelBuilder.Entity<TicketMaster>(entity =>
        {
            entity.HasIndex(e => e.TicketNumber).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Priority);
            entity.HasIndex(e => e.CreatedOn);
            entity.HasIndex(e => e.SLAResponseDue);
            entity.HasIndex(e => e.SLARestoreDue);

            entity.HasOne(e => e.Asset)
                .WithMany(a => a.Tickets)
                .HasForeignKey(e => e.AssetId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Creator)
                .WithMany(u => u.CreatedTickets)
                .HasForeignKey(e => e.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Assignee)
                .WithMany(u => u.AssignedTickets)
                .HasForeignKey(e => e.AssignedTo)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.SLAPolicy)
                .WithMany(s => s.Tickets)
                .HasForeignKey(e => e.SLAPolicyId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Audit Trail configuration
        modelBuilder.Entity<TicketAuditTrail>(entity =>
        {
            entity.HasIndex(e => e.TicketId);
            entity.HasIndex(e => e.PerformedOn);

            entity.HasOne(e => e.Ticket)
                .WithMany(t => t.AuditTrails)
                .HasForeignKey(e => e.TicketId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // SLA Policy configuration
        modelBuilder.Entity<SLAPolicy>(entity =>
        {
            entity.HasIndex(e => e.Priority);
        });

        // Work Order configuration
        modelBuilder.Entity<WorkOrder>(entity =>
        {
            entity.HasIndex(e => e.WorkOrderNumber).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.ScheduledDate);

            entity.HasOne(e => e.Ticket)
                .WithMany(t => t.WorkOrders)
                .HasForeignKey(e => e.TicketId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Engineer)
                .WithMany(u => u.WorkOrders)
                .HasForeignKey(e => e.EngineerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Attachments configuration
        modelBuilder.Entity<TicketAttachment>(entity =>
        {
            entity.HasOne(e => e.Ticket)
                .WithMany(t => t.Attachments)
                .HasForeignKey(e => e.TicketId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkOrderAttachment>(entity =>
        {
            entity.HasOne(e => e.WorkOrder)
                .WithMany(w => w.Attachments)
                .HasForeignKey(e => e.WorkOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // SystemSettings configuration
        modelBuilder.Entity<SystemSetting>(entity =>
        {
            entity.HasIndex(e => new { e.Category, e.SettingKey }).IsUnique();
        });

        // Seed default SLA policies
        SeedSLAPolicies(modelBuilder);

        // Seed default admin user
        SeedAdminUser(modelBuilder);

        // Seed default system settings
        SeedSystemSettings(modelBuilder);
    }

    private void SeedSLAPolicies(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SLAPolicy>().HasData(
            new SLAPolicy
            {
                PolicyId = 1,
                PolicyName = "Critical Priority SLA",
                Priority = "P1",
                ResponseTimeMinutes = 15,
                RestoreTimeMinutes = 120,
                EscalationLevel1Minutes = 30,
                EscalationLevel2Minutes = 60,
                IsActive = true,
                CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new SLAPolicy
            {
                PolicyId = 2,
                PolicyName = "High Priority SLA",
                Priority = "P2",
                ResponseTimeMinutes = 30,
                RestoreTimeMinutes = 240,
                EscalationLevel1Minutes = 60,
                EscalationLevel2Minutes = 120,
                IsActive = true,
                CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new SLAPolicy
            {
                PolicyId = 3,
                PolicyName = "Medium Priority SLA",
                Priority = "P3",
                ResponseTimeMinutes = 60,
                RestoreTimeMinutes = 480,
                EscalationLevel1Minutes = 120,
                EscalationLevel2Minutes = 240,
                IsActive = true,
                CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new SLAPolicy
            {
                PolicyId = 4,
                PolicyName = "Low Priority SLA",
                Priority = "P4",
                ResponseTimeMinutes = 120,
                RestoreTimeMinutes = 1440,
                EscalationLevel1Minutes = 480,
                EscalationLevel2Minutes = 720,
                IsActive = true,
                CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }

    private void SeedAdminUser(ModelBuilder modelBuilder)
    {
        // Password: Admin@123 (BCrypt hashed)
        modelBuilder.Entity<UserMaster>().HasData(
            new UserMaster
            {
                UserId = 1,
                FullName = "System Administrator",
                Email = "admin@ucc.local",
                Username = "admin",
                PasswordHash = "$2a$11$hWFq47uN0H37eujUXiD.Ie6GbPWNo4cJDIDQlypLXDpgx9N7pq7Z.", // Admin@123
                Role = UserRoles.Admin,
                MobileNumber = "9999999999",
                Designation = "System Administrator",
                IsActive = true,
                CreatedOn = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }

    private void SeedSystemSettings(ModelBuilder modelBuilder)
    {
        var seedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var settingId = 1;

        modelBuilder.Entity<SystemSetting>().HasData(
            // General Settings
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.General, SettingKey = SettingKeys.CompanyName, SettingValue = "UCC Ticketing", DataType = "string", Description = "Company name displayed in the application", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.General, SettingKey = SettingKeys.CompanyAddress, SettingValue = "", DataType = "string", Description = "Company address", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.General, SettingKey = SettingKeys.Timezone, SettingValue = "Asia/Kolkata", DataType = "string", Description = "Default timezone", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.General, SettingKey = SettingKeys.DateFormat, SettingValue = "DD/MM/YYYY", DataType = "string", Description = "Date display format", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.General, SettingKey = SettingKeys.TimeFormat, SettingValue = "24h", DataType = "string", Description = "Time display format (12h or 24h)", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.General, SettingKey = SettingKeys.Language, SettingValue = "en", DataType = "string", Description = "Default language", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.General, SettingKey = SettingKeys.AutoRefreshInterval, SettingValue = "30", DataType = "int", Description = "Dashboard auto-refresh interval in seconds", CreatedOn = seedDate },

            // Notification Settings
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Notifications, SettingKey = SettingKeys.EmailNotifications, SettingValue = "true", DataType = "bool", Description = "Enable email notifications", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Notifications, SettingKey = SettingKeys.TicketCreated, SettingValue = "true", DataType = "bool", Description = "Notify on ticket creation", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Notifications, SettingKey = SettingKeys.TicketAssigned, SettingValue = "true", DataType = "bool", Description = "Notify on ticket assignment", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Notifications, SettingKey = SettingKeys.TicketUpdated, SettingValue = "true", DataType = "bool", Description = "Notify on ticket update", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Notifications, SettingKey = SettingKeys.TicketResolved, SettingValue = "true", DataType = "bool", Description = "Notify on ticket resolution", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Notifications, SettingKey = SettingKeys.SLAWarning, SettingValue = "true", DataType = "bool", Description = "Notify on SLA warning", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Notifications, SettingKey = SettingKeys.SLABreach, SettingValue = "true", DataType = "bool", Description = "Notify on SLA breach", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Notifications, SettingKey = SettingKeys.DailyDigest, SettingValue = "false", DataType = "bool", Description = "Send daily digest email", CreatedOn = seedDate },

            // Email Settings
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Email, SettingKey = SettingKeys.SmtpServer, SettingValue = "", DataType = "string", Description = "SMTP server address", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Email, SettingKey = SettingKeys.SmtpPort, SettingValue = "587", DataType = "int", Description = "SMTP port", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Email, SettingKey = SettingKeys.SmtpUsername, SettingValue = "", DataType = "string", Description = "SMTP username", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Email, SettingKey = SettingKeys.SmtpPassword, SettingValue = "", DataType = "encrypted", Description = "SMTP password (encrypted)", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Email, SettingKey = SettingKeys.SmtpUseTLS, SettingValue = "true", DataType = "bool", Description = "Use TLS for SMTP", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Email, SettingKey = SettingKeys.SenderName, SettingValue = "UCC Ticketing", DataType = "string", Description = "Email sender name", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Email, SettingKey = SettingKeys.SenderEmail, SettingValue = "noreply@example.com", DataType = "string", Description = "Email sender address", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Email, SettingKey = SettingKeys.EmailFooter, SettingValue = "This is an automated message from UCC Ticketing System.", DataType = "string", Description = "Email footer text", CreatedOn = seedDate },

            // Security Settings
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Security, SettingKey = SettingKeys.PasswordMinLength, SettingValue = "8", DataType = "int", Description = "Minimum password length", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Security, SettingKey = SettingKeys.PasswordRequireUppercase, SettingValue = "true", DataType = "bool", Description = "Require uppercase in password", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Security, SettingKey = SettingKeys.PasswordRequireLowercase, SettingValue = "true", DataType = "bool", Description = "Require lowercase in password", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Security, SettingKey = SettingKeys.PasswordRequireNumber, SettingValue = "true", DataType = "bool", Description = "Require number in password", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Security, SettingKey = SettingKeys.PasswordRequireSpecial, SettingValue = "true", DataType = "bool", Description = "Require special character in password", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Security, SettingKey = SettingKeys.SessionTimeout, SettingValue = "60", DataType = "int", Description = "Session timeout in minutes", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Security, SettingKey = SettingKeys.MaxLoginAttempts, SettingValue = "5", DataType = "int", Description = "Maximum failed login attempts", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Security, SettingKey = SettingKeys.LockoutDuration, SettingValue = "15", DataType = "int", Description = "Account lockout duration in minutes", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Security, SettingKey = SettingKeys.EnableTwoFactor, SettingValue = "false", DataType = "bool", Description = "Enable two-factor authentication", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Security, SettingKey = SettingKeys.ForcePasswordChange, SettingValue = "90", DataType = "int", Description = "Force password change after days (0 to disable)", CreatedOn = seedDate },

            // Appearance Settings
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Appearance, SettingKey = SettingKeys.Theme, SettingValue = "dark", DataType = "string", Description = "UI theme (dark, light, system)", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Appearance, SettingKey = SettingKeys.CompactMode, SettingValue = "false", DataType = "bool", Description = "Enable compact mode", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Appearance, SettingKey = SettingKeys.ShowWelcomeMessage, SettingValue = "true", DataType = "bool", Description = "Show welcome message on dashboard", CreatedOn = seedDate },
            new SystemSetting { SettingId = settingId++, Category = SettingCategories.Appearance, SettingKey = SettingKeys.DashboardLayout, SettingValue = "default", DataType = "string", Description = "Dashboard layout style", CreatedOn = seedDate }
        );
    }
}
