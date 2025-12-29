-- Create UCCTicketing Database
-- Run this script in SQL Server Management Studio or via sqlcmd

-- Create the database if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'UCCTicketing')
BEGIN
    CREATE DATABASE UCCTicketing;
    PRINT 'Database UCCTicketing created successfully.';
END
ELSE
BEGIN
    PRINT 'Database UCCTicketing already exists.';
END
GO

USE UCCTicketing;
GO

