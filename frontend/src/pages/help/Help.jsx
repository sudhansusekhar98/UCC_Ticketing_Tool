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
    ExternalLink,
    Database,
    Package
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
        id: 'stock',
        title: 'Stock Management',
        icon: Database,
        subsections: [
            {
                id: 'stock-overview',
                title: 'Stock Overview',
                content: `
                    <h2>Stock Management</h2>
                    <p>Track and manage spare inventory across all sites and Head Office. Stock availability is used during ticket resolution and RMA workflows.</p>
                    
                    <h3>Key Concepts</h3>
                    <table>
                        <thead>
                            <tr><th>Term</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Spare</strong></td><td>A device with status "Spare" available for replacement</td></tr>
                            <tr><td><strong>Local Site Stock</strong></td><td>Spares stored at the ticket's physical site</td></tr>
                            <tr><td><strong>Head Office (HO) Stock</strong></td><td>Central inventory of spares held at the Head Office</td></tr>
                            <tr><td><strong>Asset Type</strong></td><td>Category of device (Camera, NVR, Switch, etc.)</td></tr>
                            <tr><td><strong>Device Type</strong></td><td>Specific sub-type within an asset type (e.g., ALPR Camera, PTZ Camera)</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'stock-availability',
                title: 'Stock Availability Panel',
                content: `
                    <h2>Stock Availability Panel</h2>
                    <p>The Stock Availability panel appears on the <strong>Ticket Detail</strong> page when an asset is linked to the ticket. It shows how many compatible spare items are available for replacement.</p>
                    
                    <h3>Device Type Filtering</h3>
                    <p>Stock counts are <strong>filtered by device type</strong> for accuracy. For example, if the ticket's asset is an <em>ALPR Camera</em>, only ALPR Camera spares are counted — not all cameras.</p>
                    <ul>
                        <li>Matching is based on both <strong>Asset Type</strong> and <strong>Device Type</strong></li>
                        <li>If no device type is set on the asset, all spares of the same asset type are shown</li>
                    </ul>
                    
                    <h3>Role-Based Visibility</h3>
                    <p>What you see depends on your role:</p>
                    <table>
                        <thead>
                            <tr><th>Role</th><th>Visibility</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Admin / Supervisor</strong></td><td>See stock from <em>all sites</em> with a per-site breakdown. Click any site row to expand and view individual spare items.</td></tr>
                            <tr><td><strong>Engineer</strong></td><td>See only stock from the <em>ticket's site</em>. HO and other site stock is not shown.</td></tr>
                        </tbody>
                    </table>
                    
                    <h3>Per-Site Breakdown (Admin/Supervisor)</h3>
                    <p>Admins and Supervisors see a collapsible list of all sites that have matching spare items:</p>
                    <ul>
                        <li>🟢 <strong>Ticket Site</strong> — Highlighted in green, shown first</li>
                        <li>🟦 <strong>Head Office</strong> — Shown in blue with "HO" badge</li>
                        <li>🟣 <strong>Other Sites</strong> — Shown in purple, sorted alphabetically</li>
                    </ul>
                    <p>Click a site row to expand and view individual spare item details (Asset Code, Serial Number, Make, Model).</p>
                    
                    <div class="tip-box">
                        <strong>💡 Tip:</strong> The total badge in the header shows the overall count of compatible spares across all visible sites. A red badge means no spares are available.
                    </div>
                `
            },
            {
                id: 'stock-rma-integration',
                title: 'Stock & RMA Integration',
                content: `
                    <h2>Stock & RMA Integration</h2>
                    <p>Stock availability directly supports the RMA workflow. Here's how they work together:</p>
                    
                    <h3>Replacement Stock Sourcing</h3>
                    <p>When an admin raises a replacement requisition during an RMA, they select the <strong>stock source</strong>:</p>
                    <table>
                        <thead>
                            <tr><th>Source</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>🏢 HO Stock</strong></td><td>Replacement sourced from Head Office inventory. A stock transfer requisition is created automatically for HO → Site.</td></tr>
                            <tr><td><strong>📦 Site Stock</strong></td><td>Replacement sourced from another site. A site-to-site transfer requisition is created.</td></tr>
                            <tr><td><strong>🛒 Market</strong></td><td>Replacement purchased externally. Admin proceeds with dispatch once the item is procured.</td></tr>
                        </tbody>
                    </table>
                    
                    <h3>Repaired Item Destination</h3>
                    <p>After an item is repaired and received back at HO, the admin selects where the repaired item should go:</p>
                    <table>
                        <thead>
                            <tr><th>Destination</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>🟢 Back to Site</strong></td><td>Ship the repaired item back to the original ticket site for installation (default)</td></tr>
                            <tr><td><strong>🟦 HO Stock</strong></td><td>Keep the repaired item at HO as spare stock (no shipping needed)</td></tr>
                            <tr><td><strong>🟡 Other Site</strong></td><td>Ship the repaired item to a different site (select from dropdown)</td></tr>
                        </tbody>
                    </table>
                    
                    <div class="tip-box">
                        <strong>💡 Tip:</strong> When "HO Stock" is selected as the destination, the RMA is finalized immediately and the asset is moved to HO spare stock. No additional shipping step is needed.
                    </div>
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
                    <p>Handle device repair and replacement workflows within tickets. Request, approve, ship, repair, and track the complete lifecycle.</p>
                    
                    <h3>Repair Workflow</h3>
                    <div class="workflow-steps">
                        <span class="step">Request</span>
                        <span class="arrow">→</span>
                        <span class="step">Approval</span>
                        <span class="arrow">→</span>
                        <span class="step">Send Item</span>
                        <span class="arrow">→</span>
                        <span class="step">Repair</span>
                        <span class="arrow">→</span>
                        <span class="step">Ship Return</span>
                        <span class="arrow">→</span>
                        <span class="step">Receive</span>
                        <span class="arrow">→</span>
                        <span class="step">Install</span>
                    </div>
                    
                    <h3>Replacement Workflow</h3>
                    <div class="workflow-steps">
                        <span class="step">Request</span>
                        <span class="arrow">→</span>
                        <span class="step">Approval</span>
                        <span class="arrow">→</span>
                        <span class="step">Requisition</span>
                        <span class="arrow">→</span>
                        <span class="step">Dispatch</span>
                        <span class="arrow">→</span>
                        <span class="step">Receive</span>
                        <span class="arrow">→</span>
                        <span class="step">Install</span>
                    </div>
                    
                    <h3>Status Definitions</h3>
                    <table>
                        <thead>
                            <tr><th>Status</th><th>Description</th><th>Action By</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Requested</strong></td><td>Engineer submitted RMA request</td><td>Engineer</td></tr>
                            <tr><td><strong>Approved</strong></td><td>Admin approved the request</td><td>Admin</td></tr>
                            <tr><td><strong>Rejected</strong></td><td>Request was denied</td><td>Admin</td></tr>
                            <tr><td><strong>SentToHO</strong></td><td>Faulty item shipped to Head Office</td><td>Engineer</td></tr>
                            <tr><td><strong>SentToServiceCenter</strong></td><td>Item sent directly to service center</td><td>Engineer</td></tr>
                            <tr><td><strong>ReceivedAtHO</strong></td><td>Item received at Head Office</td><td>Admin</td></tr>
                            <tr><td><strong>SentForRepairFromHO</strong></td><td>Item forwarded from HO to service center</td><td>Admin</td></tr>
                            <tr><td><strong>ItemRepairedAtHO</strong></td><td>Repaired item received back at HO</td><td>Admin</td></tr>
                            <tr><td><strong>ReturnShippedToSite</strong></td><td>Item shipped to destination site</td><td>Admin</td></tr>
                            <tr><td><strong>ReceivedAtSite</strong></td><td>Item received at the site</td><td>Engineer</td></tr>
                            <tr><td><strong>Installed</strong></td><td>Device installed and working</td><td>Engineer</td></tr>
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
                        <li>No existing active RMA for this ticket</li>
                    </ul>
                    
                    <h3>Steps</h3>
                    <ol>
                        <li>Open the ticket detail</li>
                        <li>Scroll to the "RMA Information" section</li>
                        <li>Click "Request RMA"</li>
                        <li>Fill in the form:
                            <ul>
                                <li><strong>Reason</strong> — Why replacement/repair is needed</li>
                                <li><strong>Replacement Source</strong> — Repair Only or Repair & Replace</li>
                                <li><strong>Notes</strong> — Additional context</li>
                            </ul>
                        </li>
                        <li>Submit request</li>
                    </ol>
                    
                    <div class="tip-box">
                        <strong>💡 Tip:</strong> The original device details (IP address, credentials) are automatically captured in the RMA snapshot so they can be reused during installation.
                    </div>
                `
            },
            {
                id: 'rma-repair-workflow',
                title: 'Repair Workflow Steps',
                content: `
                    <h2>Repair Workflow — Step by Step</h2>
                    
                    <h3>Step 1: Send Faulty Item</h3>
                    <p>After RMA is approved, the engineer ships the faulty device. Choose the route:</p>
                    <ul>
                        <li><strong>To HO</strong> — Ship to Head Office for forwarding</li>
                        <li><strong>Direct to Service Center</strong> — Ship directly for repair</li>
                    </ul>
                    <p>Fill in carrier name, tracking number, and remarks in the logistics modal.</p>
                    
                    <h3>Step 2: Acknowledge at HO (Admin)</h3>
                    <p>If the item was sent to HO, the admin marks it as "Received at HO" to confirm receipt.</p>
                    
                    <h3>Step 3: Forward to Service Center (Admin)</h3>
                    <p>Admin ships the item from HO to the service center, entering service center ticket reference and logistics details.</p>
                    
                    <h3>Step 4: Mark as Repaired (Admin)</h3>
                    <p>When the repaired item returns to HO, admin marks it as "Repaired Item Received at HO". The asset status changes from "In Repair" to "Spare".</p>
                    
                    <h3>Step 5: Select Destination & Ship (Admin)</h3>
                    <p>This is a key decision point. Admin selects where the repaired item should go:</p>
                    <table>
                        <thead>
                            <tr><th>Option</th><th>What Happens</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>📍 Back to Site</strong></td><td>Ship the repaired item back to the original ticket site. Engineer receives and installs it.</td></tr>
                            <tr><td><strong>🏠 HO Stock</strong></td><td>Keep the item at HO as spare stock. The RMA is finalized immediately — no shipping step required. Asset is moved to HO inventory.</td></tr>
                            <tr><td><strong>⇄ Other Site</strong></td><td>Ship to a different site selected from a dropdown. The receiving site's engineer will mark receipt.</td></tr>
                        </tbody>
                    </table>
                    
                    <h3>Step 6: Receive at Site</h3>
                    <p>The engineer at the destination site marks the item as received. The asset is moved to the site's spare stock.</p>
                    
                    <h3>Step 7: Install Device</h3>
                    <p>The engineer installs the device and updates credentials (IP Address, Username, Password). Original values are pre-filled from the RMA snapshot.</p>
                    
                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Leave the password field blank during installation to keep the existing password. All credentials are stored encrypted.
                    </div>
                `
            },
            {
                id: 'rma-replacement',
                title: 'Replacement Workflow',
                content: `
                    <h2>Replacement Workflow</h2>
                    <p>When the RMA is of type "Repair & Replace", a parallel replacement workflow runs alongside the repair.</p>
                    
                    <h3>Raising a Replacement Requisition (Admin)</h3>
                    <ol>
                        <li>In the RMA section, click "Raise Replacement Requisition"</li>
                        <li>Select a <strong>Stock Source</strong>:
                            <ul>
                                <li><strong>🏢 HO Stock</strong> — Automatically creates an HO → Site stock transfer</li>
                                <li><strong>📦 Site Stock</strong> — Creates a site-to-site transfer (enter source site ID)</li>
                                <li><strong>🛒 Market</strong> — External purchase, dispatch manually after procurement</li>
                            </ul>
                        </li>
                        <li>Add remarks and submit</li>
                    </ol>
                    
                    <h3>Dispatching a Replacement (Admin)</h3>
                    <p>Once the replacement item is ready, admin dispatches it to the site by filling in logistics details (carrier, tracking number).</p>
                    
                    <h3>Receiving & Installing</h3>
                    <p>The site engineer marks the replacement as received, then uses the Install modal to update device credentials and complete the RMA.</p>
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

