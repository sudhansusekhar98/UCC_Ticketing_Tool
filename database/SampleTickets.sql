-- Insert Sample Tickets
-- Note: Using CHAR(36) for $ symbol to avoid PowerShell issues

INSERT INTO Tickets (TicketNumber, AssetId, Category, SubCategory, Title, Description, Priority, PriorityScore, Impact, Urgency, Status, Source, CreatedBy, AssignedTo, SLAPolicyId, CreatedOn, AssignedOn, SLAResponseDue, SLARestoreDue, IsSLAResponseBreached, IsSLARestoreBreached, EscalationLevel, RequiresVerification)
VALUES 
-- Critical P1 Ticket - SLA Breached
('TKT-20241220-001', 3, 'Device Failure', 'Camera Offline', 'Control Room Camera Completely Offline', 'Camera CAM-CC-003 has been completely offline since morning. No video feed available. This is critical for security monitoring.', 'P1', 45, 5, 3, 'InProgress', 'Manual', 1, 2, 1, DATEADD(HOUR, -3, GETUTCDATE()), DATEADD(HOUR, -2, GETUTCDATE()), DATEADD(HOUR, -2, GETUTCDATE()), DATEADD(HOUR, -1, GETUTCDATE()), 1, 1, 2, 1),

-- High P2 Ticket - At Risk  
('TKT-20241220-002', 7, 'Performance Issue', 'Video Quality', 'Traffic Junction Camera Degraded Video Quality', 'Camera CAM-TJ-002 showing degraded video quality - image is blurry and pixelated. Possible lens or sensor issue.', 'P2', 27, 3, 3, 'Assigned', 'VMS Alert', 1, 3, 2, DATEADD(MINUTE, -45, GETUTCDATE()), DATEADD(MINUTE, -30, GETUTCDATE()), DATEADD(MINUTE, 15, GETUTCDATE()), DATEADD(HOUR, 3, GETUTCDATE()), 0, 0, 0, 1),

-- Medium P3 Ticket - On Track
('TKT-20241220-003', 12, 'Preventive Maintenance', 'Scheduled Service', 'Metro Station Camera Scheduled Maintenance', 'Scheduled preventive maintenance for CAM-MS-003. Lens cleaning and firmware update required.', 'P3', 12, 2, 2, 'Open', 'Scheduled', 1, NULL, 3, DATEADD(MINUTE, -20, GETUTCDATE()), NULL, DATEADD(MINUTE, 40, GETUTCDATE()), DATEADD(HOUR, 8, GETUTCDATE()), 0, 0, 0, 0),

-- P2 Ticket Resolved
('TKT-20241220-004', 6, 'Connectivity Issue', 'Network Problem', 'Traffic Junction Camera Intermittent Connection', 'Camera CAM-TJ-001 experiencing intermittent network disconnections. Network switch port may need replacement.', 'P2', 30, 4, 2, 'Resolved', 'NMS Alert', 1, 4, 2, DATEADD(HOUR, -5, GETUTCDATE()), DATEADD(HOUR, -4, GETUTCDATE()), DATEADD(HOUR, -4, GETUTCDATE()), DATEADD(HOUR, -1, GETUTCDATE()), 0, 0, 0, 1),

-- P4 Low Priority - Open
('TKT-20241220-005', 2, 'Configuration', 'Settings Update', 'Update Camera Recording Schedule', 'Update recording schedule for parking area camera to include weekend coverage.', 'P4', 6, 1, 2, 'Open', 'Manual', 6, NULL, 4, DATEADD(HOUR, -1, GETUTCDATE()), NULL, DATEADD(HOUR, 1, GETUTCDATE()), DATEADD(HOUR, 23, GETUTCDATE()), 0, 0, 0, 0),

-- P3 Acknowledged
('TKT-20241220-006', 10, 'Device Failure', 'Hardware Issue', 'Metro Platform Camera Power Fluctuation', 'Camera CAM-MS-001 reporting power fluctuation warnings. May need UPS or power supply check.', 'P3', 18, 3, 2, 'Acknowledged', 'VMS Alert', 1, 4, 3, DATEADD(HOUR, -2, GETUTCDATE()), DATEADD(HOUR, -1, GETUTCDATE()), DATEADD(MINUTE, 30, GETUTCDATE()), DATEADD(HOUR, 6, GETUTCDATE()), 0, 0, 0, 1),

-- P1 Critical - Assigned
('TKT-20241220-007', 4, 'Device Failure', 'NVR Issue', 'NVR Storage Near Capacity', 'NVR-CC-001 storage at 95% capacity. Urgent cleanup or expansion needed to prevent recording loss.', 'P1', 50, 5, 4, 'Assigned', 'NMS Alert', 1, 3, 1, DATEADD(MINUTE, -10, GETUTCDATE()), DATEADD(MINUTE, -5, GETUTCDATE()), DATEADD(MINUTE, 5, GETUTCDATE()), DATEADD(HOUR, 2, GETUTCDATE()), 0, 0, 0, 1),

-- Closed Ticket
('TKT-20241219-001', 5, 'Connectivity Issue', 'Switch Problem', 'Network Switch Port Failure', 'Port 15 on SW-CC-001 showing errors. Replaced patch cable and resolved.', 'P2', 24, 3, 2, 'Closed', 'Manual', 1, 2, 2, DATEADD(DAY, -1, GETUTCDATE()), DATEADD(DAY, -1, DATEADD(HOUR, 1, GETUTCDATE())), DATEADD(DAY, -1, DATEADD(HOUR, 1, GETUTCDATE())), DATEADD(DAY, -1, DATEADD(HOUR, 4, GETUTCDATE())), 0, 0, 0, 1);

-- Add resolution to resolved/closed tickets
UPDATE Tickets SET RootCause = 'Faulty network cable causing intermittent drops', ResolutionSummary = 'Replaced network cable and verified stable connection for 2 hours', ResolvedOn = DATEADD(HOUR, -2, GETUTCDATE()) WHERE TicketNumber = 'TKT-20241220-004';
UPDATE Tickets SET RootCause = 'Physical damage to patch cable', ResolutionSummary = 'Replaced patch cable on port 15. Verified connectivity stable.', ResolvedOn = DATEADD(DAY, -1, DATEADD(HOUR, 3, GETUTCDATE())), ClosedOn = DATEADD(DAY, -1, DATEADD(HOUR, 4, GETUTCDATE())), VerifiedBy = 'Rahul Verma', VerifiedOn = DATEADD(DAY, -1, DATEADD(HOUR, 4, GETUTCDATE())) WHERE TicketNumber = 'TKT-20241219-001';

-- Add audit trail entries
INSERT INTO TicketAuditTrails (TicketId, Action, OldValue, NewValue, Remarks, PerformedBy, PerformedByName, PerformedOn)
SELECT TicketId, 'Created', NULL, 'Open', 'Ticket created', 1, 'System Administrator', CreatedOn FROM Tickets;

INSERT INTO TicketAuditTrails (TicketId, Action, OldValue, NewValue, Remarks, PerformedBy, PerformedByName, PerformedOn)
SELECT TicketId, 'Assigned', 'Unassigned', (SELECT FullName FROM Users WHERE UserId = Tickets.AssignedTo), 'Ticket assigned to engineer', 1, 'System Administrator', AssignedOn 
FROM Tickets WHERE AssignedTo IS NOT NULL;

SELECT 'Sample tickets inserted successfully!' as Status;
