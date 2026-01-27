import React, { useState, useEffect } from 'react';
import {
    HelpCircle,
    Book,
    LayoutDashboard,
    Ticket,
    Monitor,
    MapPin,
    Users,
    BarChart3,
    Settings,
    Bell,
    RotateCcw,
    User,
    LogIn,
    ChevronRight,
    ChevronDown,
    Search,
    ExternalLink
} from 'lucide-react';
import './Help.css';

// Help content data - matches the markdown documentation
const HELP_SECTIONS = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: Book,
        subsections: [
            {
                id: 'overview',
                title: 'Overview',
                content: `
                    <h2>Welcome to TicketOps</h2>
                    <p>TicketOps is a comprehensive ticketing and asset management system designed for surveillance infrastructure maintenance.</p>
                    
                    <h3>Quick Start Guide</h3>
                    <ol>
                        <li><strong>Login</strong> - Enter your credentials on the login page</li>
                        <li><strong>Dashboard</strong> - View real-time statistics and quick actions</li>
                        <li><strong>Create Ticket</strong> - Log new issues from Dashboard or Tickets menu</li>
                        <li><strong>Track Progress</strong> - Monitor ticket status and SLA compliance</li>
                    </ol>
                    
                    <h3>User Roles</h3>
                    <table>
                        <thead>
                            <tr><th>Role</th><th>Permissions</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Admin</strong></td><td>Full access to all modules, user management, settings</td></tr>
                            <tr><td><strong>Supervisor</strong></td><td>Manage tickets, view reports, manage team assignments</td></tr>
                            <tr><td><strong>Dispatcher</strong></td><td>Create/assign tickets, view assets and sites</td></tr>
                            <tr><td><strong>Field Engineer</strong></td><td>Work on assigned tickets, update status, RMA requests</td></tr>
                            <tr><td><strong>Viewer</strong></td><td>Read-only access to tickets and assets</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'login',
                title: 'Login & Authentication',
                content: `
                    <h2>Login & Authentication</h2>
                    <p>The Login page is your gateway to the TicketOps system. Secure authentication ensures only authorized users can access the platform.</p>
                    
                    <h3>How to Login</h3>
                    <ol>
                        <li>Navigate to the TicketOps URL</li>
                        <li>Enter your <strong>Username</strong></li>
                        <li>Enter your <strong>Password</strong></li>
                        <li>Click <strong>"Sign In"</strong></li>
                    </ol>
                    
                    <h3>Password Requirements</h3>
                    <ul>
                        <li>Minimum 8 characters</li>
                        <li>At least 1 uppercase letter (A-Z)</li>
                        <li>At least 1 lowercase letter (a-z)</li>
                        <li>At least 1 number (0-9)</li>
                        <li>At least 1 special character (!@#$%^&*)</li>
                    </ul>
                    
                    <h3>Troubleshooting</h3>
                    <table>
                        <thead>
                            <tr><th>Issue</th><th>Solution</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>Wrong password</td><td>Check caps lock, try again</td></tr>
                            <tr><td>Account locked</td><td>Wait 15 minutes or contact admin</td></tr>
                            <tr><td>Forgot password</td><td>Contact admin for reset</td></tr>
                        </tbody>
                    </table>
                `
            }
        ]
    },
    {
        id: 'dashboard',
        title: 'Dashboard',
        icon: LayoutDashboard,
        subsections: [
            {
                id: 'dashboard-overview',
                title: 'Dashboard Overview',
                content: `
                    <h2>Dashboard</h2>
                    <p>The Dashboard provides a real-time overview of your workspace activity, displaying key metrics, charts, and quick actions.</p>
                    
                    <h3>Statistics Cards</h3>
                    <table>
                        <thead>
                            <tr><th>Card</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Open Tickets</strong></td><td>Number of tickets awaiting action</td></tr>
                            <tr><td><strong>In Progress</strong></td><td>Tickets currently being worked on</td></tr>
                            <tr><td><strong>SLA Breached</strong></td><td>Tickets that have exceeded their SLA deadline</td></tr>
                            <tr><td><strong>SLA Compliance</strong></td><td>Percentage of tickets resolved within SLA</td></tr>
                        </tbody>
                    </table>
                    
                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Click on any stat card to view the filtered list of tickets.
                    </div>
                    
                    <h3>Charts</h3>
                    <ul>
                        <li><strong>Tickets by Priority</strong> - Donut chart showing P1/P2/P3/P4 distribution</li>
                        <li><strong>Tickets by Status</strong> - Bar chart showing ticket count per status</li>
                        <li><strong>Ticket Categories</strong> - Progress bars showing category distribution</li>
                    </ul>
                    
                    <h3>Auto-Refresh</h3>
                    <p>The dashboard automatically refreshes every <strong>30 seconds</strong>. You can also manually refresh using the Refresh button.</p>
                `
            }
        ]
    },
    {
        id: 'tickets',
        title: 'Tickets',
        icon: Ticket,
        subsections: [
            {
                id: 'ticket-list',
                title: 'Ticket List',
                content: `
                    <h2>Ticket List</h2>
                    <p>View all tickets with powerful filtering and sorting options.</p>
                    
                    <h3>Available Filters</h3>
                    <ul>
                        <li><strong>Status</strong> - Open, Assigned, In Progress, Resolved, Closed</li>
                        <li><strong>Priority</strong> - P1 (Critical), P2 (High), P3 (Medium), P4 (Low)</li>
                        <li><strong>Category</strong> - Hardware, Software, Network, Power, etc.</li>
                        <li><strong>Site</strong> - Filter by location</li>
                        <li><strong>Assigned To</strong> - Filter by engineer</li>
                        <li><strong>SLA Status</strong> - Breached, At Risk, On Track</li>
                    </ul>
                `
            },
            {
                id: 'create-ticket',
                title: 'Creating a Ticket',
                content: `
                    <h2>Creating a Ticket</h2>
                    
                    <h3>Required Fields</h3>
                    <ol>
                        <li><strong>Site</strong> - Select the location where the issue occurred</li>
                        <li><strong>Category</strong> - Type of issue (Hardware, Software, etc.)</li>
                        <li><strong>Title</strong> - Brief description of the problem</li>
                        <li><strong>Priority</strong> - Urgency level</li>
                    </ol>
                    
                    <h3>Optional Fields</h3>
                    <ul>
                        <li><strong>Asset</strong> - Link to specific device/equipment</li>
                        <li><strong>Description</strong> - Detailed explanation of the issue</li>
                        <li><strong>Attachments</strong> - Photos or documents</li>
                    </ul>
                    
                    <h3>Auto-Generated</h3>
                    <ul>
                        <li><strong>Ticket Number</strong> - Format: TKT-YYYYMMDD-XXXX</li>
                        <li><strong>SLA Deadlines</strong> - Based on priority and SLA policy</li>
                    </ul>
                `
            },
            {
                id: 'ticket-lifecycle',
                title: 'Ticket Lifecycle',
                content: `
                    <h2>Ticket Lifecycle</h2>
                    
                    <div class="workflow-steps">
                        <span class="step">Open</span>
                        <span class="arrow">→</span>
                        <span class="step">Assigned</span>
                        <span class="arrow">→</span>
                        <span class="step">Acknowledged</span>
                        <span class="arrow">→</span>
                        <span class="step">In Progress</span>
                        <span class="arrow">→</span>
                        <span class="step">Resolved</span>
                        <span class="arrow">→</span>
                        <span class="step">Verified</span>
                        <span class="arrow">→</span>
                        <span class="step">Closed</span>
                    </div>
                    
                    <h3>Status Descriptions</h3>
                    <table>
                        <thead>
                            <tr><th>Status</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Open</strong></td><td>Newly created, awaiting assignment</td></tr>
                            <tr><td><strong>Assigned</strong></td><td>Engineer assigned, awaiting acknowledgment</td></tr>
                            <tr><td><strong>Acknowledged</strong></td><td>Engineer has accepted the ticket</td></tr>
                            <tr><td><strong>In Progress</strong></td><td>Work is actively being done</td></tr>
                            <tr><td><strong>On Hold</strong></td><td>Paused (waiting for parts, approval, etc.)</td></tr>
                            <tr><td><strong>Escalated</strong></td><td>Requires higher-level attention</td></tr>
                            <tr><td><strong>Resolved</strong></td><td>Issue fixed, awaiting verification</td></tr>
                            <tr><td><strong>Closed</strong></td><td>Ticket completed</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'sla-management',
                title: 'SLA Management',
                content: `
                    <h2>SLA Management</h2>
                    
                    <h3>Priority SLA Targets</h3>
                    <table>
                        <thead>
                            <tr><th>Priority</th><th>Response Time</th><th>Resolution Time</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>P1 (Critical)</strong></td><td>15 minutes</td><td>4 hours</td></tr>
                            <tr><td><strong>P2 (High)</strong></td><td>30 minutes</td><td>8 hours</td></tr>
                            <tr><td><strong>P3 (Medium)</strong></td><td>2 hours</td><td>24 hours</td></tr>
                            <tr><td><strong>P4 (Low)</strong></td><td>4 hours</td><td>48 hours</td></tr>
                        </tbody>
                    </table>
                    
                    <h3>SLA Indicators</h3>
                    <ul>
                        <li>🟢 <strong>On Track</strong> - Within SLA limits</li>
                        <li>🟡 <strong>At Risk</strong> - Approaching deadline</li>
                        <li>🔴 <strong>Breached</strong> - SLA exceeded</li>
                    </ul>
                `
            }
        ]
    },
    {
        id: 'assets',
        title: 'Assets',
        icon: Monitor,
        subsections: [
            {
                id: 'asset-management',
                title: 'Asset Management',
                content: `
                    <h2>Asset Management</h2>
                    <p>Manage surveillance infrastructure devices and equipment. Track device status, maintenance history, and link assets to tickets.</p>
                    
                    <h3>Device Types</h3>
                    <table>
                        <thead>
                            <tr><th>Type</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Camera</strong></td><td>CCTV/IP cameras</td></tr>
                            <tr><td><strong>NVR</strong></td><td>Network Video Recorder</td></tr>
                            <tr><td><strong>Server</strong></td><td>Recording/Analytics servers</td></tr>
                            <tr><td><strong>Switch</strong></td><td>Network switches</td></tr>
                            <tr><td><strong>Router</strong></td><td>Network routers</td></tr>
                            <tr><td><strong>UPS</strong></td><td>Uninterruptible Power Supply</td></tr>
                        </tbody>
                    </table>
                    
                    <h3>Status Values</h3>
                    <ul>
                        <li>🟢 <strong>Operational</strong> - Working normally</li>
                        <li>🔴 <strong>Faulty</strong> - Not working, needs repair</li>
                        <li>🟡 <strong>Under Maintenance</strong> - Currently being serviced</li>
                        <li>⚫ <strong>Decommissioned</strong> - No longer in use</li>
                    </ul>
                `
            },
            {
                id: 'add-asset',
                title: 'Adding an Asset',
                content: `
                    <h2>Adding an Asset</h2>
                    
                    <h3>Required Fields</h3>
                    <table>
                        <thead>
                            <tr><th>Field</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Asset Code</strong></td><td>Unique identifier for the asset</td></tr>
                            <tr><td><strong>Device Type</strong></td><td>Type of equipment</td></tr>
                            <tr><td><strong>Site</strong></td><td>Physical location</td></tr>
                            <tr><td><strong>Status</strong></td><td>Current operational status</td></tr>
                        </tbody>
                    </table>
                    
                    <h3>Optional Fields</h3>
                    <ul>
                        <li>Serial Number</li>
                        <li>IP Address</li>
                        <li>MAC Address</li>
                        <li>Model / Make</li>
                        <li>Zone within site</li>
                        <li>Criticality level</li>
                        <li>Warranty Expiry</li>
                    </ul>
                `
            },
            {
                id: 'bulk-import',
                title: 'Bulk Import',
                content: `
                    <h2>Bulk Import (Admin Only)</h2>
                    <p>Upload multiple assets at once using a CSV or Excel file.</p>
                    
                    <h3>Required CSV Columns</h3>
                    <div class="csv-columns">
                        <span class="csv-col required">assetCode</span>
                        <span class="csv-col required">deviceType</span>
                        <span class="csv-col required">siteId</span>
                        <span class="csv-col required">status</span>
                    </div>
                    
                    <h3>Optional Columns</h3>
                    <div class="csv-columns">
                        <span class="csv-col">ipAddress</span>
                        <span class="csv-col">serialNumber</span>
                        <span class="csv-col">mac</span>
                        <span class="csv-col">make</span>
                        <span class="csv-col">model</span>
                        <span class="csv-col">userName</span>
                        <span class="csv-col">password</span>
                        <span class="csv-col">remark</span>
                    </div>
                    
                    <h3>Example CSV Format</h3>
                    <div class="csv-example">
                        <table class="csv-table">
                            <thead>
                                <tr>
                                    <th>assetCode</th>
                                    <th>deviceType</th>
                                    <th>siteId</th>
                                    <th>status</th>
                                    <th>ipAddress</th>
                                    <th>serialNumber</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>CAM-001</td>
                                    <td>Camera</td>
                                    <td>site123</td>
                                    <td>Operational</td>
                                    <td>192.168.1.100</td>
                                    <td>SN123456</td>
                                </tr>
                                <tr>
                                    <td>NVR-001</td>
                                    <td>NVR</td>
                                    <td>site123</td>
                                    <td>Operational</td>
                                    <td>192.168.1.10</td>
                                    <td>SN789012</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <h3>Import Steps</h3>
                    <ol>
                        <li>Click the <strong>Template</strong> button to download the import template</li>
                        <li>Fill in asset data following the column headers</li>
                        <li>Click the <strong>Import</strong> button to open the import dialog</li>
                        <li>Select your completed CSV or Excel file</li>
                        <li>Review import results and fix any errors</li>
                    </ol>
                    
                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Always download the latest template to ensure correct column format. Fields marked with * are required.
                    </div>
                `
            }
        ]
    },
    {
        id: 'sites',
        title: 'Sites',
        icon: MapPin,
        subsections: [
            {
                id: 'site-management',
                title: 'Site Management',
                content: `
                    <h2>Site Management</h2>
                    <p>Sites represent physical locations where surveillance equipment is installed. Sites serve as the primary organizational unit for assets and tickets.</p>
                    
                    <h3>Required Fields</h3>
                    <table>
                        <thead>
                            <tr><th>Field</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Site Code</strong></td><td>Unique identifier (e.g., SITE-001)</td></tr>
                            <tr><td><strong>Site Name</strong></td><td>Full name of the location</td></tr>
                        </tbody>
                    </table>
                    
                    <h3>Optional Fields</h3>
                    <ul>
                        <li>Address, City, State, Country, Pincode</li>
                        <li>Contact Name, Phone, Email</li>
                        <li>SLA Policy</li>
                        <li>Notes</li>
                    </ul>
                `
            }
        ]
    },
    {
        id: 'users',
        title: 'Users',
        icon: Users,
        subsections: [
            {
                id: 'user-management',
                title: 'User Management',
                content: `
                    <h2>User Management</h2>
                    <p>Create and manage user accounts, assign roles, and control access permissions.</p>
                    
                    <h3>Creating a User</h3>
                    <table>
                        <thead>
                            <tr><th>Field</th><th>Required</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Username</strong></td><td>Yes</td><td>Login username (unique)</td></tr>
                            <tr><td><strong>Password</strong></td><td>Yes</td><td>Initial password</td></tr>
                            <tr><td><strong>Full Name</strong></td><td>Yes</td><td>User's display name</td></tr>
                            <tr><td><strong>Email</strong></td><td>Yes</td><td>Email address</td></tr>
                            <tr><td><strong>Role</strong></td><td>Yes</td><td>User role</td></tr>
                            <tr><td><strong>Phone</strong></td><td>No</td><td>Contact number</td></tr>
                            <tr><td><strong>Assigned Sites</strong></td><td>No</td><td>Sites the user can access</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'permissions',
                title: 'Role Permissions',
                content: `
                    <h2>Role Permissions Matrix</h2>
                    
                    <h3>Tickets Permissions</h3>
                    <table>
                        <thead>
                            <tr><th>Action</th><th>Admin</th><th>Supervisor</th><th>Dispatcher</th><th>Engineer</th><th>Viewer</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>View All</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td><td>✅</td></tr>
                            <tr><td>Create</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td></tr>
                            <tr><td>Edit</td><td>✅</td><td>✅</td><td>✅</td><td>Own</td><td>❌</td></tr>
                            <tr><td>Delete</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td></tr>
                            <tr><td>Assign</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
                        </tbody>
                    </table>
                    
                    <h3>Assets Permissions</h3>
                    <table>
                        <thead>
                            <tr><th>Action</th><th>Admin</th><th>Supervisor</th><th>Dispatcher</th><th>Engineer</th><th>Viewer</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>View</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
                            <tr><td>Create</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
                            <tr><td>Edit</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
                            <tr><td>Bulk Import</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td></tr>
                        </tbody>
                    </table>
                `
            }
        ]
    },
    {
        id: 'reports',
        title: 'Reports',
        icon: BarChart3,
        subsections: [
            {
                id: 'reports-overview',
                title: 'Reports Overview',
                content: `
                    <h2>Reports Module</h2>
                    <p>Generate insights from ticket, asset, and RMA data with various filtering and export options.</p>
                    
                    <h3>Available Reports</h3>
                    <table>
                        <thead>
                            <tr><th>Report</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Tickets Report</strong></td><td>Comprehensive ticket data with SLA status</td></tr>
                            <tr><td><strong>Employee Status</strong></td><td>Field engineer activity and assignments</td></tr>
                            <tr><td><strong>Asset Status</strong></td><td>Asset inventory with status breakdown</td></tr>
                            <tr><td><strong>RMA Report</strong></td><td>RMA requests with timeline details</td></tr>
                        </tbody>
                    </table>
                    
                    <h3>Filtering Options</h3>
                    <ul>
                        <li><strong>Date Range</strong> - Start and End date</li>
                        <li><strong>Site</strong> - Filter by location</li>
                        <li><strong>Status</strong> - Filter by item status</li>
                        <li><strong>Priority</strong> - Filter tickets by priority</li>
                    </ul>
                `
            },
            {
                id: 'export',
                title: 'Exporting Data',
                content: `
                    <h2>Exporting Data</h2>
                    
                    <h3>Export Process</h3>
                    <ol>
                        <li>Apply desired filters</li>
                        <li>Select report type from dropdown</li>
                        <li>Click "Export Report" button</li>
                        <li>File downloads automatically as Excel (.xlsx)</li>
                    </ol>
                    
                    <h3>Filename Format</h3>
                    <code>[report-type]_report_YYYYMMDD_HHMMSS.xlsx</code>
                    
                    <p>Example: <code>tickets_report_20260121_163000.xlsx</code></p>
                `
            }
        ]
    },
    {
        id: 'rma',
        title: 'RMA',
        icon: RotateCcw,
        subsections: [
            {
                id: 'rma-overview',
                title: 'RMA Overview',
                content: `
                    <h2>RMA (Return Merchandise Authorization)</h2>
                    <p>Handle device replacement workflows within tickets. Request, approve, and track the replacement process.</p>
                    
                    <div class="workflow-steps">
                        <span class="step">Request</span>
                        <span class="arrow">→</span>
                        <span class="step">Approval</span>
                        <span class="arrow">→</span>
                        <span class="step">Ordering</span>
                        <span class="arrow">→</span>
                        <span class="step">Dispatch</span>
                        <span class="arrow">→</span>
                        <span class="step">Receive</span>
                        <span class="arrow">→</span>
                        <span class="step">Install</span>
                        <span class="arrow">→</span>
                        <span class="step">Complete</span>
                    </div>
                    
                    <h3>Status Definitions</h3>
                    <table>
                        <thead>
                            <tr><th>Status</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Requested</strong></td><td>Engineer submitted RMA request</td></tr>
                            <tr><td><strong>Approved</strong></td><td>Supervisor/Admin approved</td></tr>
                            <tr><td><strong>Rejected</strong></td><td>Request was denied</td></tr>
                            <tr><td><strong>Ordered</strong></td><td>Replacement device ordered</td></tr>
                            <tr><td><strong>Dispatched</strong></td><td>Device shipped/in transit</td></tr>
                            <tr><td><strong>Received</strong></td><td>Device received at site</td></tr>
                            <tr><td><strong>Installed</strong></td><td>New device installed</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'request-rma',
                title: 'Requesting an RMA',
                content: `
                    <h2>Requesting an RMA</h2>
                    
                    <h3>Prerequisites</h3>
                    <ul>
                        <li>Ticket must be "In Progress"</li>
                        <li>You must be assigned to the ticket</li>
                        <li>Asset must be linked to the ticket</li>
                    </ul>
                    
                    <h3>Steps</h3>
                    <ol>
                        <li>Open the ticket detail</li>
                        <li>Go to "RMA" tab</li>
                        <li>Click "Request RMA"</li>
                        <li>Fill in the form:
                            <ul>
                                <li><strong>Reason</strong> - Why replacement is needed</li>
                                <li><strong>Notes</strong> - Additional details</li>
                                <li><strong>Urgency</strong> - Normal/Urgent</li>
                            </ul>
                        </li>
                        <li>Submit request</li>
                    </ol>
                `
            }
        ]
    },
    {
        id: 'settings',
        title: 'Settings',
        icon: Settings,
        subsections: [
            {
                id: 'system-settings',
                title: 'System Settings',
                content: `
                    <h2>System Settings (Admin Only)</h2>
                    <p>Configure system behavior, manage lookups, and set up SLA policies.</p>
                    
                    <h3>Available Settings</h3>
                    <ul>
                        <li><strong>General Settings</strong> - System name, timezone, date format</li>
                        <li><strong>Ticket Settings</strong> - Auto-assignment, default priority</li>
                        <li><strong>Notification Settings</strong> - Email and in-app alerts</li>
                        <li><strong>SLA Configuration</strong> - Response/resolution targets</li>
                    </ul>
                    
                    <h3>Lookup Values</h3>
                    <p>Manage predefined values for dropdowns:</p>
                    <ul>
                        <li>Categories and Sub-Categories</li>
                        <li>Device Types</li>
                        <li>Status Values</li>
                    </ul>
                `
            }
        ]
    },
    {
        id: 'notifications',
        title: 'Notifications',
        icon: Bell,
        subsections: [
            {
                id: 'notification-types',
                title: 'Notification Types',
                content: `
                    <h2>Notifications</h2>
                    <p>Stay informed about important events with real-time alerts.</p>
                    
                    <h3>Notification Types</h3>
                    <table>
                        <thead>
                            <tr><th>Type</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>🎫 <strong>Ticket Created</strong></td><td>New ticket assigned to you</td></tr>
                            <tr><td>📝 <strong>Ticket Updated</strong></td><td>Status change on your ticket</td></tr>
                            <tr><td>💬 <strong>Comment Added</strong></td><td>New comment on your ticket</td></tr>
                            <tr><td>⚠️ <strong>SLA Warning</strong></td><td>Ticket approaching SLA deadline</td></tr>
                            <tr><td>🔴 <strong>SLA Breached</strong></td><td>Ticket exceeded SLA</td></tr>
                            <tr><td>👤 <strong>Assignment</strong></td><td>Ticket assigned/reassigned</td></tr>
                            <tr><td>🔄 <strong>RMA Update</strong></td><td>RMA status changed</td></tr>
                        </tbody>
                    </table>
                `
            }
        ]
    },
    {
        id: 'profile',
        title: 'Profile',
        icon: User,
        subsections: [
            {
                id: 'profile-settings',
                title: 'Profile Settings',
                content: `
                    <h2>Profile Settings</h2>
                    <p>Manage your personal account settings and preferences.</p>
                    
                    <h3>Editable Fields</h3>
                    <ul>
                        <li>Full Name (display name)</li>
                        <li>Email Address</li>
                        <li>Phone Number</li>
                        <li>Profile Picture</li>
                    </ul>
                    
                    <h3>Changing Password</h3>
                    <ol>
                        <li>Go to Profile page</li>
                        <li>Click "Change Password"</li>
                        <li>Enter Current Password</li>
                        <li>Enter New Password (twice)</li>
                        <li>Click "Update Password"</li>
                    </ol>
                    
                    <h3>Notification Preferences</h3>
                    <p>Configure which notifications you receive:</p>
                    <ul>
                        <li>In-App: Ticket assignments, status changes, SLA warnings</li>
                        <li>Email: New assignments, SLA alerts, daily digest</li>
                    </ul>
                `
            }
        ]
    }
];

export default function Help() {
    const [expandedSection, setExpandedSection] = useState('getting-started');
    const [activeSubsection, setActiveSubsection] = useState('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [isTransitioning, setIsTransitioning] = useState(false);
    const contentRef = React.useRef(null);

    const handleSectionClick = (sectionId) => {
        if (expandedSection === sectionId) {
            setExpandedSection(null);
        } else {
            setExpandedSection(sectionId);
            const section = HELP_SECTIONS.find(s => s.id === sectionId);
            if (section?.subsections?.length > 0) {
                // Smooth transition to first subsection
                smoothNavigate(section.subsections[0].id);
            }
        }
    };

    const handleSubsectionClick = (subsectionId) => {
        smoothNavigate(subsectionId);
    };

    const smoothNavigate = (subsectionId) => {
        if (activeSubsection === subsectionId) return;

        // Start fade out
        setIsTransitioning(true);

        // After fade out, change content
        setTimeout(() => {
            setActiveSubsection(subsectionId);

            // Scroll content to top smoothly
            if (contentRef.current) {
                contentRef.current.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }

            // Fade in
            setTimeout(() => {
                setIsTransitioning(false);
            }, 50);
        }, 150);
    };

    const getCurrentContent = () => {
        for (const section of HELP_SECTIONS) {
            const subsection = section.subsections?.find(s => s.id === activeSubsection);
            if (subsection) {
                return subsection.content;
            }
        }
        return '<p>Select a topic from the sidebar to view help content.</p>';
    };

    const filteredSections = searchQuery
        ? HELP_SECTIONS.filter(section =>
            section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            section.subsections?.some(sub =>
                sub.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
        : HELP_SECTIONS;

    // Handle search result click - expand section and navigate
    const handleSearchResultClick = (sectionId, subsectionId) => {
        setExpandedSection(sectionId);
        smoothNavigate(subsectionId);
        setSearchQuery('');
    };

    return (
        <div className="help-page">
            <div className="help-header">
                <div className="help-header-content">
                    <HelpCircle size={32} className="help-header-icon" />
                    <div>
                        <h1>Help Center</h1>
                        <p>Documentation and guides for TicketOps</p>
                    </div>
                </div>
                <div className="help-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search help topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="help-container">
                <aside className="help-sidebar">
                    <nav className="help-nav">
                        {filteredSections.map((section) => {
                            const Icon = section.icon;
                            const isExpanded = expandedSection === section.id;

                            return (
                                <div key={section.id} className="help-nav-section">
                                    <button
                                        className={`help-nav-item ${isExpanded ? 'active' : ''}`}
                                        onClick={() => handleSectionClick(section.id)}
                                    >
                                        <Icon size={18} />
                                        <span>{section.title}</span>
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    {isExpanded && section.subsections && (
                                        <div className="help-nav-subsections animate-slide-down">
                                            {section.subsections.map((sub) => (
                                                <button
                                                    key={sub.id}
                                                    className={`help-nav-subitem ${activeSubsection === sub.id ? 'active' : ''}`}
                                                    onClick={() => handleSubsectionClick(sub.id)}
                                                >
                                                    {sub.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                </aside>

                <main className="help-content" ref={contentRef}>
                    <article
                        className={`help-article ${isTransitioning ? 'transitioning' : ''}`}
                        dangerouslySetInnerHTML={{ __html: getCurrentContent() }}
                    />
                </main>
            </div>
        </div>
    );
}

