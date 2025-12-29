-- Add TicketActivities and TicketAttachments tables
-- Run this script on the UCCTicketing database

USE UCCTicketing;
GO

-- Create TicketActivities table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TicketActivities')
BEGIN
    CREATE TABLE TicketActivities (
        ActivityId INT IDENTITY(1,1) PRIMARY KEY,
        TicketId INT NOT NULL,
        UserId INT NOT NULL,
        ActivityType NVARCHAR(50) NOT NULL DEFAULT 'Comment',
        Content NVARCHAR(MAX) NOT NULL,
        IsInternal BIT NOT NULL DEFAULT 0,
        CreatedOn DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        CONSTRAINT FK_TicketActivities_Tickets FOREIGN KEY (TicketId) 
            REFERENCES Tickets(TicketId) ON DELETE CASCADE,
        CONSTRAINT FK_TicketActivities_Users FOREIGN KEY (UserId) 
            REFERENCES Users(UserId) ON DELETE NO ACTION
    );
    
    CREATE INDEX IX_TicketActivities_TicketId ON TicketActivities(TicketId);
    CREATE INDEX IX_TicketActivities_UserId ON TicketActivities(UserId);
    CREATE INDEX IX_TicketActivities_CreatedOn ON TicketActivities(CreatedOn);
    
    PRINT 'TicketActivities table created successfully.';
END
ELSE
BEGIN
    PRINT 'TicketActivities table already exists.';
END
GO

-- Add new columns to TicketAttachments if they don't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TicketAttachments') AND name = 'ActivityId')
BEGIN
    ALTER TABLE TicketAttachments ADD ActivityId INT NULL;
    
    ALTER TABLE TicketAttachments ADD CONSTRAINT FK_TicketAttachments_Activities 
        FOREIGN KEY (ActivityId) REFERENCES TicketActivities(ActivityId) ON DELETE SET NULL;
    
    PRINT 'ActivityId column added to TicketAttachments.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TicketAttachments') AND name = 'StorageType')
BEGIN
    ALTER TABLE TicketAttachments ADD StorageType NVARCHAR(50) NOT NULL DEFAULT 'Database';
    ALTER TABLE TicketAttachments ADD CloudinaryUrl NVARCHAR(500) NULL;
    ALTER TABLE TicketAttachments ADD CloudinaryPublicId NVARCHAR(100) NULL;
    ALTER TABLE TicketAttachments ADD FileData VARBINARY(MAX) NULL;
    
    PRINT 'Storage columns added to TicketAttachments.';
END
GO

-- Update TicketAttachments table structure if needed
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'TicketAttachments') AND name = 'UploadedBy')
BEGIN
    EXEC sp_rename 'TicketAttachments.UploadedByUserId', 'UploadedBy', 'COLUMN';
    PRINT 'Column renamed from UploadedByUserId to UploadedBy.';
END
GO

PRINT 'Migration completed successfully!';
