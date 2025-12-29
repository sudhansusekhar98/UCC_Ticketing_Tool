-- Assets Table Migration Script
-- Updates the Assets table with new columns
-- Run this in SSMS on UCCTicketing database

USE UCCTicketing;
GO

-- ============================================
-- 1. DROP IPAddress column
-- ============================================
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'IPAddress')
BEGIN
    ALTER TABLE Assets DROP COLUMN IPAddress;
    PRINT '✓ IPAddress column dropped.';
END
ELSE
BEGIN
    PRINT '⚠ IPAddress column already removed.';
END
GO

-- ============================================
-- 2. ADD NEW COLUMNS
-- ============================================

-- Make
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'Make')
BEGIN
    ALTER TABLE Assets ADD Make NVARCHAR(100) NULL;
    PRINT '✓ Make column added.';
END
GO

-- Model
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'Model')
BEGIN
    ALTER TABLE Assets ADD Model NVARCHAR(150) NULL;
    PRINT '✓ Model column added.';
END
GO

-- ManagementIP
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'ManagementIP')
BEGIN
    ALTER TABLE Assets ADD ManagementIP NVARCHAR(50) NULL;
    PRINT '✓ ManagementIP column added.';
END
GO

-- RoleIP
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'RoleIP')
BEGIN
    ALTER TABLE Assets ADD RoleIP NVARCHAR(50) NULL;
    PRINT '✓ RoleIP column added.';
END
GO

-- LocationName
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'LocationName')
BEGIN
    ALTER TABLE Assets ADD LocationName NVARCHAR(150) NULL;
    PRINT '✓ LocationName column added.';
END
GO

-- DeviceType
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'DeviceType')
BEGIN
    ALTER TABLE Assets ADD DeviceType NVARCHAR(100) NULL;
    PRINT '✓ DeviceType column added.';
END
GO

-- UsedFor
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'UsedFor')
BEGIN
    ALTER TABLE Assets ADD UsedFor NVARCHAR(150) NULL;
    PRINT '✓ UsedFor column added.';
END
GO

-- UserName (for asset credentials)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'UserName')
BEGIN
    ALTER TABLE Assets ADD UserName NVARCHAR(100) NULL;
    PRINT '✓ UserName column added.';
END
GO

-- Password (for asset credentials - should be encrypted in future)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'Password')
BEGIN
    ALTER TABLE Assets ADD [Password] NVARCHAR(255) NULL;
    PRINT '✓ Password column added.';
END
GO

-- Remark
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'Remark')
BEGIN
    ALTER TABLE Assets ADD Remark NVARCHAR(500) NULL;
    PRINT '✓ Remark column added.';
END
GO

-- ============================================
-- 3. POPULATE Make & Model FROM MakeModel
-- ============================================
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Assets') AND name = 'MakeModel')
BEGIN
    UPDATE Assets
    SET
        Make = LEFT(MakeModel, CHARINDEX(' ', MakeModel + ' ') - 1),
        Model = LTRIM(SUBSTRING(
                    MakeModel,
                    CHARINDEX(' ', MakeModel + ' ') + 1,
                    LEN(MakeModel)))
    WHERE MakeModel IS NOT NULL
      AND (Make IS NULL OR Model IS NULL);
    
    PRINT '✓ Make & Model populated from MakeModel.';
END
GO

-- ============================================
-- 4. DATA ALIGNMENT (Optional but recommended)
-- ============================================

-- AssetType → DeviceType
UPDATE Assets
SET DeviceType = AssetType
WHERE DeviceType IS NULL AND AssetType IS NOT NULL;
PRINT '✓ DeviceType populated from AssetType.';
GO

-- LocationDescription → LocationName
UPDATE Assets
SET LocationName = LocationDescription
WHERE LocationName IS NULL AND LocationDescription IS NOT NULL;
PRINT '✓ LocationName populated from LocationDescription.';
GO

-- ============================================
-- 5. VERIFY COLUMNS
-- ============================================
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Assets'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT '============================================';
PRINT '✓ MIGRATION COMPLETED SUCCESSFULLY!';
PRINT '============================================';
PRINT '';
PRINT 'New columns added:';
PRINT '  - Make, Model (split from MakeModel)';
PRINT '  - ManagementIP, RoleIP';
PRINT '  - LocationName, DeviceType';
PRINT '  - UsedFor, UserName, Password, Remark';
PRINT '';
PRINT 'Removed columns:';
PRINT '  - IPAddress';
PRINT '';
PRINT 'NOTE: Password field should be encrypted in production!';
