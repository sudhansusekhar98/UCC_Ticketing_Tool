using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace UCCTicketing.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SystemSettings",
                columns: table => new
                {
                    SettingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SettingKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SettingValue = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DataType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedOn = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ModifiedBy = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemSettings", x => x.SettingId);
                    table.ForeignKey(
                        name: "FK_SystemSettings_Users_ModifiedBy",
                        column: x => x.ModifiedBy,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.InsertData(
                table: "SystemSettings",
                columns: new[] { "SettingId", "Category", "CreatedOn", "DataType", "Description", "IsActive", "ModifiedBy", "ModifiedOn", "SettingKey", "SettingValue" },
                values: new object[,]
                {
                    { 1, "General", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "Company name displayed in the application", true, null, null, "CompanyName", "UCC Ticketing" },
                    { 2, "General", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "Company address", true, null, null, "CompanyAddress", "" },
                    { 3, "General", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "Default timezone", true, null, null, "Timezone", "Asia/Kolkata" },
                    { 4, "General", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "Date display format", true, null, null, "DateFormat", "DD/MM/YYYY" },
                    { 5, "General", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "Time display format (12h or 24h)", true, null, null, "TimeFormat", "24h" },
                    { 6, "General", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "Default language", true, null, null, "Language", "en" },
                    { 7, "General", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "int", "Dashboard auto-refresh interval in seconds", true, null, null, "AutoRefreshInterval", "30" },
                    { 8, "Notifications", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Enable email notifications", true, null, null, "EmailNotifications", "true" },
                    { 9, "Notifications", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Notify on ticket creation", true, null, null, "TicketCreated", "true" },
                    { 10, "Notifications", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Notify on ticket assignment", true, null, null, "TicketAssigned", "true" },
                    { 11, "Notifications", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Notify on ticket update", true, null, null, "TicketUpdated", "true" },
                    { 12, "Notifications", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Notify on ticket resolution", true, null, null, "TicketResolved", "true" },
                    { 13, "Notifications", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Notify on SLA warning", true, null, null, "SLAWarning", "true" },
                    { 14, "Notifications", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Notify on SLA breach", true, null, null, "SLABreach", "true" },
                    { 15, "Notifications", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Send daily digest email", true, null, null, "DailyDigest", "false" },
                    { 16, "Email", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "SMTP server address", true, null, null, "SmtpServer", "" },
                    { 17, "Email", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "int", "SMTP port", true, null, null, "SmtpPort", "587" },
                    { 18, "Email", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "SMTP username", true, null, null, "SmtpUsername", "" },
                    { 19, "Email", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "encrypted", "SMTP password (encrypted)", true, null, null, "SmtpPassword", "" },
                    { 20, "Email", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Use TLS for SMTP", true, null, null, "SmtpUseTLS", "true" },
                    { 21, "Email", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "Email sender name", true, null, null, "SenderName", "UCC Ticketing" },
                    { 22, "Email", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "Email sender address", true, null, null, "SenderEmail", "noreply@example.com" },
                    { 23, "Email", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "Email footer text", true, null, null, "EmailFooter", "This is an automated message from UCC Ticketing System." },
                    { 24, "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "int", "Minimum password length", true, null, null, "PasswordMinLength", "8" },
                    { 25, "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Require uppercase in password", true, null, null, "PasswordRequireUppercase", "true" },
                    { 26, "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Require lowercase in password", true, null, null, "PasswordRequireLowercase", "true" },
                    { 27, "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Require number in password", true, null, null, "PasswordRequireNumber", "true" },
                    { 28, "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Require special character in password", true, null, null, "PasswordRequireSpecial", "true" },
                    { 29, "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "int", "Session timeout in minutes", true, null, null, "SessionTimeout", "60" },
                    { 30, "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "int", "Maximum failed login attempts", true, null, null, "MaxLoginAttempts", "5" },
                    { 31, "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "int", "Account lockout duration in minutes", true, null, null, "LockoutDuration", "15" },
                    { 32, "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Enable two-factor authentication", true, null, null, "EnableTwoFactor", "false" },
                    { 33, "Security", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "int", "Force password change after days (0 to disable)", true, null, null, "ForcePasswordChange", "90" },
                    { 34, "Appearance", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "UI theme (dark, light, system)", true, null, null, "Theme", "dark" },
                    { 35, "Appearance", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Enable compact mode", true, null, null, "CompactMode", "false" },
                    { 36, "Appearance", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "bool", "Show welcome message on dashboard", true, null, null, "ShowWelcomeMessage", "true" },
                    { 37, "Appearance", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "string", "Dashboard layout style", true, null, null, "DashboardLayout", "default" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_SystemSettings_Category_SettingKey",
                table: "SystemSettings",
                columns: new[] { "Category", "SettingKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SystemSettings_ModifiedBy",
                table: "SystemSettings",
                column: "ModifiedBy");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SystemSettings");
        }
    }
}
