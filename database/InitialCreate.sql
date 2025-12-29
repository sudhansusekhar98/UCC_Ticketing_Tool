IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Sites] (
    [SiteId] int NOT NULL IDENTITY,
    [SiteName] nvarchar(100) NOT NULL,
    [City] nvarchar(100) NOT NULL,
    [Zone] nvarchar(100) NULL,
    [Ward] nvarchar(100) NULL,
    [Address] nvarchar(500) NULL,
    [Latitude] float NULL,
    [Longitude] float NULL,
    [ContactPerson] nvarchar(100) NULL,
    [ContactPhone] nvarchar(20) NULL,
    [IsActive] bit NOT NULL,
    [CreatedOn] datetime2 NOT NULL,
    [ModifiedOn] datetime2 NULL,
    CONSTRAINT [PK_Sites] PRIMARY KEY ([SiteId])
);
GO

CREATE TABLE [SLAPolicies] (
    [PolicyId] int NOT NULL IDENTITY,
    [PolicyName] nvarchar(100) NOT NULL,
    [Priority] nvarchar(20) NOT NULL,
    [ResponseTimeMinutes] int NOT NULL,
    [RestoreTimeMinutes] int NOT NULL,
    [EscalationLevel1Minutes] int NOT NULL,
    [EscalationLevel2Minutes] int NOT NULL,
    [EscalationL1Emails] nvarchar(200) NULL,
    [EscalationL2Emails] nvarchar(200) NULL,
    [IsActive] bit NOT NULL,
    [CreatedOn] datetime2 NOT NULL,
    [ModifiedOn] datetime2 NULL,
    CONSTRAINT [PK_SLAPolicies] PRIMARY KEY ([PolicyId])
);
GO

CREATE TABLE [Assets] (
    [AssetId] int NOT NULL IDENTITY,
    [AssetCode] nvarchar(50) NOT NULL,
    [AssetType] nvarchar(50) NOT NULL,
    [MakeModel] nvarchar(100) NULL,
    [Manufacturer] nvarchar(100) NULL,
    [SerialNumber] nvarchar(100) NULL,
    [IPAddress] nvarchar(50) NULL,
    [MacAddress] nvarchar(50) NULL,
    [SiteId] int NOT NULL,
    [LocationDescription] nvarchar(200) NULL,
    [Criticality] int NOT NULL,
    [Status] nvarchar(50) NOT NULL,
    [InstallationDate] datetime2 NULL,
    [WarrantyEndDate] datetime2 NULL,
    [VmsReferenceId] nvarchar(100) NULL,
    [NmsReferenceId] nvarchar(100) NULL,
    [IsActive] bit NOT NULL,
    [CreatedOn] datetime2 NOT NULL,
    [ModifiedOn] datetime2 NULL,
    CONSTRAINT [PK_Assets] PRIMARY KEY ([AssetId]),
    CONSTRAINT [FK_Assets_Sites_SiteId] FOREIGN KEY ([SiteId]) REFERENCES [Sites] ([SiteId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [Users] (
    [UserId] int NOT NULL IDENTITY,
    [FullName] nvarchar(100) NOT NULL,
    [Email] nvarchar(100) NOT NULL,
    [Username] nvarchar(50) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [Role] nvarchar(50) NOT NULL,
    [MobileNumber] nvarchar(20) NULL,
    [Designation] nvarchar(100) NULL,
    [SiteId] int NULL,
    [IsActive] bit NOT NULL,
    [CreatedOn] datetime2 NOT NULL,
    [LastLoginOn] datetime2 NULL,
    [RefreshToken] nvarchar(max) NULL,
    [RefreshTokenExpiry] datetime2 NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([UserId]),
    CONSTRAINT [FK_Users_Sites_SiteId] FOREIGN KEY ([SiteId]) REFERENCES [Sites] ([SiteId]) ON DELETE SET NULL
);
GO

CREATE TABLE [Tickets] (
    [TicketId] int NOT NULL IDENTITY,
    [TicketNumber] nvarchar(20) NOT NULL,
    [AssetId] int NULL,
    [Category] nvarchar(100) NOT NULL,
    [SubCategory] nvarchar(100) NULL,
    [Title] nvarchar(500) NOT NULL,
    [Description] nvarchar(2000) NULL,
    [Priority] nvarchar(20) NOT NULL,
    [PriorityScore] int NOT NULL,
    [Impact] int NOT NULL,
    [Urgency] int NOT NULL,
    [Status] nvarchar(50) NOT NULL,
    [Source] nvarchar(50) NOT NULL,
    [CreatedBy] int NOT NULL,
    [AssignedTo] int NULL,
    [SLAPolicyId] int NULL,
    [CreatedOn] datetime2 NOT NULL,
    [AssignedOn] datetime2 NULL,
    [AcknowledgedOn] datetime2 NULL,
    [ResolvedOn] datetime2 NULL,
    [ClosedOn] datetime2 NULL,
    [SLAResponseDue] datetime2 NULL,
    [SLARestoreDue] datetime2 NULL,
    [IsSLAResponseBreached] bit NOT NULL,
    [IsSLARestoreBreached] bit NOT NULL,
    [EscalationLevel] int NOT NULL,
    [RootCause] nvarchar(500) NULL,
    [ResolutionSummary] nvarchar(2000) NULL,
    [VerifiedBy] nvarchar(100) NULL,
    [VerifiedOn] datetime2 NULL,
    [RequiresVerification] bit NOT NULL,
    [Tags] nvarchar(500) NULL,
    [ModifiedOn] datetime2 NULL,
    CONSTRAINT [PK_Tickets] PRIMARY KEY ([TicketId]),
    CONSTRAINT [FK_Tickets_Assets_AssetId] FOREIGN KEY ([AssetId]) REFERENCES [Assets] ([AssetId]) ON DELETE SET NULL,
    CONSTRAINT [FK_Tickets_SLAPolicies_SLAPolicyId] FOREIGN KEY ([SLAPolicyId]) REFERENCES [SLAPolicies] ([PolicyId]) ON DELETE SET NULL,
    CONSTRAINT [FK_Tickets_Users_AssignedTo] FOREIGN KEY ([AssignedTo]) REFERENCES [Users] ([UserId]) ON DELETE SET NULL,
    CONSTRAINT [FK_Tickets_Users_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [TicketAttachments] (
    [AttachmentId] int NOT NULL IDENTITY,
    [TicketId] int NOT NULL,
    [FileName] nvarchar(255) NOT NULL,
    [FilePath] nvarchar(500) NOT NULL,
    [ContentType] nvarchar(100) NULL,
    [FileSize] bigint NOT NULL,
    [AttachmentType] nvarchar(50) NOT NULL,
    [Description] nvarchar(500) NULL,
    [UploadedBy] int NOT NULL,
    [UploadedOn] datetime2 NOT NULL,
    CONSTRAINT [PK_TicketAttachments] PRIMARY KEY ([AttachmentId]),
    CONSTRAINT [FK_TicketAttachments_Tickets_TicketId] FOREIGN KEY ([TicketId]) REFERENCES [Tickets] ([TicketId]) ON DELETE CASCADE
);
GO

CREATE TABLE [TicketAuditTrails] (
    [AuditId] int NOT NULL IDENTITY,
    [TicketId] int NOT NULL,
    [Action] nvarchar(100) NOT NULL,
    [OldValue] nvarchar(500) NULL,
    [NewValue] nvarchar(500) NULL,
    [Remarks] nvarchar(1000) NULL,
    [PerformedBy] int NOT NULL,
    [PerformedByName] nvarchar(100) NOT NULL,
    [PerformedOn] datetime2 NOT NULL,
    [IPAddress] nvarchar(50) NULL,
    CONSTRAINT [PK_TicketAuditTrails] PRIMARY KEY ([AuditId]),
    CONSTRAINT [FK_TicketAuditTrails_Tickets_TicketId] FOREIGN KEY ([TicketId]) REFERENCES [Tickets] ([TicketId]) ON DELETE CASCADE
);
GO

CREATE TABLE [WorkOrders] (
    [WorkOrderId] int NOT NULL IDENTITY,
    [WorkOrderNumber] nvarchar(20) NOT NULL,
    [TicketId] int NOT NULL,
    [EngineerId] int NOT NULL,
    [Status] nvarchar(50) NOT NULL,
    [WorkOrderType] nvarchar(50) NOT NULL,
    [ChecklistJson] nvarchar(max) NULL,
    [PartsUsedJson] nvarchar(max) NULL,
    [ScheduledDate] datetime2 NULL,
    [StartedOn] datetime2 NULL,
    [CompletedOn] datetime2 NULL,
    [StartLatitude] float NULL,
    [StartLongitude] float NULL,
    [EndLatitude] float NULL,
    [EndLongitude] float NULL,
    [WorkPerformed] nvarchar(2000) NULL,
    [Remarks] nvarchar(2000) NULL,
    [Observations] nvarchar(1000) NULL,
    [RequiresApproval] bit NOT NULL,
    [ApprovedBy] int NULL,
    [ApprovedOn] datetime2 NULL,
    [ApprovalRemarks] nvarchar(500) NULL,
    [CreatedOn] datetime2 NOT NULL,
    [ModifiedOn] datetime2 NULL,
    CONSTRAINT [PK_WorkOrders] PRIMARY KEY ([WorkOrderId]),
    CONSTRAINT [FK_WorkOrders_Tickets_TicketId] FOREIGN KEY ([TicketId]) REFERENCES [Tickets] ([TicketId]) ON DELETE CASCADE,
    CONSTRAINT [FK_WorkOrders_Users_EngineerId] FOREIGN KEY ([EngineerId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkOrderAttachments] (
    [AttachmentId] int NOT NULL IDENTITY,
    [WorkOrderId] int NOT NULL,
    [FileName] nvarchar(255) NOT NULL,
    [FilePath] nvarchar(500) NOT NULL,
    [ContentType] nvarchar(100) NULL,
    [FileSize] bigint NOT NULL,
    [AttachmentType] nvarchar(50) NOT NULL,
    [Description] nvarchar(500) NULL,
    [Latitude] float NULL,
    [Longitude] float NULL,
    [CapturedOn] datetime2 NULL,
    [UploadedBy] int NOT NULL,
    [UploadedOn] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkOrderAttachments] PRIMARY KEY ([AttachmentId]),
    CONSTRAINT [FK_WorkOrderAttachments_WorkOrders_WorkOrderId] FOREIGN KEY ([WorkOrderId]) REFERENCES [WorkOrders] ([WorkOrderId]) ON DELETE CASCADE
);
GO

IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'PolicyId', N'CreatedOn', N'EscalationL1Emails', N'EscalationL2Emails', N'EscalationLevel1Minutes', N'EscalationLevel2Minutes', N'IsActive', N'ModifiedOn', N'PolicyName', N'Priority', N'ResponseTimeMinutes', N'RestoreTimeMinutes') AND [object_id] = OBJECT_ID(N'[SLAPolicies]'))
    SET IDENTITY_INSERT [SLAPolicies] ON;
INSERT INTO [SLAPolicies] ([PolicyId], [CreatedOn], [EscalationL1Emails], [EscalationL2Emails], [EscalationLevel1Minutes], [EscalationLevel2Minutes], [IsActive], [ModifiedOn], [PolicyName], [Priority], [ResponseTimeMinutes], [RestoreTimeMinutes])
VALUES (1, '2024-01-01T00:00:00.0000000Z', NULL, NULL, 30, 60, CAST(1 AS bit), NULL, N'Critical Priority SLA', N'P1', 15, 120),
(2, '2024-01-01T00:00:00.0000000Z', NULL, NULL, 60, 120, CAST(1 AS bit), NULL, N'High Priority SLA', N'P2', 30, 240),
(3, '2024-01-01T00:00:00.0000000Z', NULL, NULL, 120, 240, CAST(1 AS bit), NULL, N'Medium Priority SLA', N'P3', 60, 480),
(4, '2024-01-01T00:00:00.0000000Z', NULL, NULL, 480, 720, CAST(1 AS bit), NULL, N'Low Priority SLA', N'P4', 120, 1440);
IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'PolicyId', N'CreatedOn', N'EscalationL1Emails', N'EscalationL2Emails', N'EscalationLevel1Minutes', N'EscalationLevel2Minutes', N'IsActive', N'ModifiedOn', N'PolicyName', N'Priority', N'ResponseTimeMinutes', N'RestoreTimeMinutes') AND [object_id] = OBJECT_ID(N'[SLAPolicies]'))
    SET IDENTITY_INSERT [SLAPolicies] OFF;
GO

IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'UserId', N'CreatedOn', N'Designation', N'Email', N'FullName', N'IsActive', N'LastLoginOn', N'MobileNumber', N'PasswordHash', N'RefreshToken', N'RefreshTokenExpiry', N'Role', N'SiteId', N'Username') AND [object_id] = OBJECT_ID(N'[Users]'))
    SET IDENTITY_INSERT [Users] ON;
INSERT INTO [Users] ([UserId], [CreatedOn], [Designation], [Email], [FullName], [IsActive], [LastLoginOn], [MobileNumber], [PasswordHash], [RefreshToken], [RefreshTokenExpiry], [Role], [SiteId], [Username])
VALUES (1, '2024-01-01T00:00:00.0000000Z', N'System Administrator', N'admin@ucc.local', N'System Administrator', CAST(1 AS bit), NULL, N'9999999999', N'$2a$11$rBnXYfChE.FeKYjKFB8Dxu5JRhOqTB/HK.FvyKKjO4qRqGhVvzfPO', NULL, NULL, N'Admin', NULL, N'admin');
IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'UserId', N'CreatedOn', N'Designation', N'Email', N'FullName', N'IsActive', N'LastLoginOn', N'MobileNumber', N'PasswordHash', N'RefreshToken', N'RefreshTokenExpiry', N'Role', N'SiteId', N'Username') AND [object_id] = OBJECT_ID(N'[Users]'))
    SET IDENTITY_INSERT [Users] OFF;
GO

CREATE UNIQUE INDEX [IX_Assets_AssetCode] ON [Assets] ([AssetCode]);
GO

CREATE INDEX [IX_Assets_IPAddress] ON [Assets] ([IPAddress]);
GO

CREATE INDEX [IX_Assets_SerialNumber] ON [Assets] ([SerialNumber]);
GO

CREATE INDEX [IX_Assets_SiteId] ON [Assets] ([SiteId]);
GO

CREATE INDEX [IX_Sites_City] ON [Sites] ([City]);
GO

CREATE INDEX [IX_Sites_SiteName] ON [Sites] ([SiteName]);
GO

CREATE INDEX [IX_SLAPolicies_Priority] ON [SLAPolicies] ([Priority]);
GO

CREATE INDEX [IX_TicketAttachments_TicketId] ON [TicketAttachments] ([TicketId]);
GO

CREATE INDEX [IX_TicketAuditTrails_PerformedOn] ON [TicketAuditTrails] ([PerformedOn]);
GO

CREATE INDEX [IX_TicketAuditTrails_TicketId] ON [TicketAuditTrails] ([TicketId]);
GO

CREATE INDEX [IX_Tickets_AssetId] ON [Tickets] ([AssetId]);
GO

CREATE INDEX [IX_Tickets_AssignedTo] ON [Tickets] ([AssignedTo]);
GO

CREATE INDEX [IX_Tickets_CreatedBy] ON [Tickets] ([CreatedBy]);
GO

CREATE INDEX [IX_Tickets_CreatedOn] ON [Tickets] ([CreatedOn]);
GO

CREATE INDEX [IX_Tickets_Priority] ON [Tickets] ([Priority]);
GO

CREATE INDEX [IX_Tickets_SLAPolicyId] ON [Tickets] ([SLAPolicyId]);
GO

CREATE INDEX [IX_Tickets_SLAResponseDue] ON [Tickets] ([SLAResponseDue]);
GO

CREATE INDEX [IX_Tickets_SLARestoreDue] ON [Tickets] ([SLARestoreDue]);
GO

CREATE INDEX [IX_Tickets_Status] ON [Tickets] ([Status]);
GO

CREATE UNIQUE INDEX [IX_Tickets_TicketNumber] ON [Tickets] ([TicketNumber]);
GO

CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);
GO

CREATE INDEX [IX_Users_SiteId] ON [Users] ([SiteId]);
GO

CREATE UNIQUE INDEX [IX_Users_Username] ON [Users] ([Username]);
GO

CREATE INDEX [IX_WorkOrderAttachments_WorkOrderId] ON [WorkOrderAttachments] ([WorkOrderId]);
GO

CREATE INDEX [IX_WorkOrders_EngineerId] ON [WorkOrders] ([EngineerId]);
GO

CREATE INDEX [IX_WorkOrders_ScheduledDate] ON [WorkOrders] ([ScheduledDate]);
GO

CREATE INDEX [IX_WorkOrders_Status] ON [WorkOrders] ([Status]);
GO

CREATE INDEX [IX_WorkOrders_TicketId] ON [WorkOrders] ([TicketId]);
GO

CREATE UNIQUE INDEX [IX_WorkOrders_WorkOrderNumber] ON [WorkOrders] ([WorkOrderNumber]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20251220062711_InitialCreate', N'8.0.11');
GO

COMMIT;
GO

