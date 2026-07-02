import React, { useState } from 'react';
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
    Package,
    Sparkles,
    FolderOpen,
    ClipboardList,
    Shield,
    Map,
    Activity
} from 'lucide-react';
import DOMPurify from 'dompurify';
import './Help.css';

const HELP_SECTIONS = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: Book,
        subsections: [
            {
                id: 'whats-new',
                title: "What's New",
                content: `
                    <h2>What's New - June 2026</h2>
                    <p>The following features and improvements were added in the latest release.</p>

                    <h3>📊 SLA At Risk - Auto Detection</h3>
                    <p>Tickets are now automatically flagged as <strong>At Risk</strong> when their SLA resolution deadline is within 4 hours. The system checks every 10 minutes and updates the status in real time - no manual action required.</p>

                    <h3>🔔 Multi-Stage SLA Breach Reminders</h3>
                    <p>Two automated warning stages now run before a ticket breaches SLA:</p>
                    <ul>
                        <li><strong>4-hour warning</strong> - Email sent to the assigned engineer plus all supervisors and dispatchers; an in-app ⚠️ notification is delivered in real time.</li>
                        <li><strong>1-hour final warning</strong> - Email sent to the assigned engineer and all admins/supervisors; a 🚨 urgent in-app notification is delivered.</li>
                        <li><strong>Breach</strong> - Email + in-app notification to the engineer and all admins immediately on breach.</li>
                    </ul>

                    <h3>📈 Accurate SLA Compliance %</h3>
                    <p>The SLA Compliance percentage on the Dashboard is now calculated by comparing actual resolution timestamps against SLA deadlines. Only tickets with SLA deadlines set are counted, ensuring the figure reflects true performance rather than flagged statuses alone.</p>

                    <h3>🔄 Ticket Re-open - Full Workflow Restart</h3>
                    <p>Re-opening a ticket now fully clears the previous assignment. The ticket returns to <strong>Open</strong> status with no engineer assigned, so the complete assignment → acknowledge → in progress → resolve workflow must be followed again from scratch.</p>

                    <h3>🏷️ RMA Number on RMA Records</h3>
                    <p>The RMA Records page now prominently displays the <strong>RMA number</strong> (e.g. RMA-20260115-0001) on every card and list row. The search bar also accepts RMA number as a search term.</p>

                    <h3>👤 Dashboard Online User Cards</h3>
                    <p>Hovering over an online user avatar in the Dashboard now shows a <strong>popup card</strong> with the user's profile picture, full name, and role. The card appears below the avatar.</p>

                    <h3>🎯 Dashboard KPI Card Navigation</h3>
                    <ul>
                        <li><strong>Critical (SLA Breached)</strong> card now navigates to the Ticket List filtered by SLA Status = Breached.</li>
                        <li><strong>SLA Compliance</strong> card now navigates to Ticket List showing <em>both</em> Breached and At Risk tickets (the "Issues" combined filter).</li>
                    </ul>

                    <h3>🔌 Cable / Fibre Cut Ticket Stock Integration</h3>
                    <p>Tickets raised for cable or fibre cut issues can now track material consumption directly. Stock quantities are deducted automatically when engineers log usage from the ticket detail page.</p>
                    <ul>
                        <li><strong>Sub-Category smart chips</strong> - Clickable suggestion chips appear based on the selected Category.</li>
                        <li><strong>Cable / Wire Usage panel</strong> - Appears automatically on tickets with Fibre Cut, Cable Cut, or Cable Damage sub-categories.</li>
                        <li><strong>Usage history</strong> - All cable consumption entries logged with engineer, timestamp, quantity, and notes.</li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> The new "Breached &amp; At Risk" combined filter in the Ticket List SLA dropdown lets you see all tickets that need immediate attention in one view.
                    </div>
                `
            },
            {
                id: 'overview',
                title: 'Overview',
                content: `
                    <h2>Welcome to TicketOps</h2>
                    <p>TicketOps is a comprehensive ticketing, asset management, and field operations system designed for surveillance infrastructure maintenance teams.</p>

                    <h3>Quick Start Guide</h3>
                    <ol>
                        <li><strong>Login</strong> - Enter your credentials on the login page</li>
                        <li><strong>Dashboard</strong> - View real-time statistics, active tickets, and team presence</li>
                        <li><strong>Create Ticket</strong> - Log new issues from the Dashboard or Tickets menu</li>
                        <li><strong>Track Progress</strong> - Monitor ticket status, SLA compliance, and assignments</li>
                    </ol>

                    <h3>User Roles</h3>
                    <table>
                        <thead>
                            <tr><th>Role</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Admin</strong></td><td>Full access to all modules, user management, settings, and reporting</td></tr>
                            <tr><td><strong>Supervisor</strong></td><td>Manage tickets, view reports, oversee team assignments and SLA</td></tr>
                            <tr><td><strong>Dispatcher</strong></td><td>Create and assign tickets, manage schedules and escalations</td></tr>
                            <tr><td><strong>L1 Engineer</strong></td><td>Work on assigned tickets, update status, log work, request RMAs</td></tr>
                            <tr><td><strong>L2 Engineer</strong></td><td>Advanced field work, can handle escalated tickets</td></tr>
                            <tr><td><strong>SiteClient</strong></td><td>Client access - view tickets and assets for their sites</td></tr>
                            <tr><td><strong>ClientViewer</strong></td><td>Read-only client access to their site's data</td></tr>
                        </tbody>
                    </table>

                    <h3>Modules at a Glance</h3>
                    <table>
                        <thead>
                            <tr><th>Module</th><th>Purpose</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Dashboard</strong></td><td>Real-time KPIs, charts, team activity, and recent tickets</td></tr>
                            <tr><td><strong>Tickets</strong></td><td>Full ticketing lifecycle with SLA tracking</td></tr>
                            <tr><td><strong>Assets</strong></td><td>Device/equipment inventory linked to sites and tickets</td></tr>
                            <tr><td><strong>Sites</strong></td><td>Physical locations managing assets and tickets</td></tr>
                            <tr><td><strong>Stock Management</strong></td><td>Spare inventory, transfers, requisitions, cable tracking</td></tr>
                            <tr><td><strong>RMA</strong></td><td>Repair and replacement authorization workflows</td></tr>
                            <tr><td><strong>Field Operations</strong></td><td>CCTV/surveillance installation project management</td></tr>
                            <tr><td><strong>Work Log</strong></td><td>Daily work activity tracking per engineer</td></tr>
                            <tr><td><strong>Reports</strong></td><td>Excel exports for tickets, assets, stock, and user activity</td></tr>
                            <tr><td><strong>Admin</strong></td><td>Client registrations, user rights, system configuration</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'login',
                title: 'Login & Authentication',
                content: `
                    <h2>Login & Authentication</h2>
                    <p>The Login page is your gateway to TicketOps. Sessions are secured with JWT tokens and expire automatically after 6 hours of inactivity.</p>

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
                        <li>At least 1 uppercase letter (A–Z)</li>
                        <li>At least 1 lowercase letter (a–z)</li>
                        <li>At least 1 number (0–9)</li>
                        <li>At least 1 special character (!@#$%^&amp;*)</li>
                    </ul>

                    <h3>Troubleshooting</h3>
                    <table>
                        <thead>
                            <tr><th>Issue</th><th>Solution</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>Wrong password</td><td>Check Caps Lock and try again</td></tr>
                            <tr><td>Account locked</td><td>Wait 15 minutes or contact your Admin</td></tr>
                            <tr><td>Forgot password</td><td>Contact Admin for a reset</td></tr>
                            <tr><td>Session expired</td><td>Log in again - sessions last 6 hours</td></tr>
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
                    <p>The Dashboard provides a real-time overview of your workspace - key KPI cards, charts, recent activity, and team presence. It refreshes automatically every 30 seconds, and you can trigger a manual refresh via the refresh button.</p>

                    <h3>KPI Cards</h3>
                    <table>
                        <thead>
                            <tr><th>Card</th><th>What it Shows</th><th>Click Action</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Open Tickets</strong></td><td>Tickets in Open status awaiting assignment</td><td>Ticket List filtered by Status = Open</td></tr>
                            <tr><td><strong>In Progress</strong></td><td>Tickets actively being worked on</td><td>Ticket List filtered by Status = In Progress</td></tr>
                            <tr><td><strong>Critical (SLA Breached)</strong></td><td>Tickets that have exceeded their SLA resolution deadline</td><td>Ticket List filtered by SLA Status = Breached</td></tr>
                            <tr><td><strong>SLA Compliance %</strong></td><td>Percentage of resolved/closed tickets that met their SLA deadline. Calculated from actual timestamps - only tickets with SLA dates set are counted.</td><td>Ticket List filtered by SLA Status = Breached &amp; At Risk</td></tr>
                        </tbody>
                    </table>

                    <h3>Charts</h3>
                    <ul>
                        <li><strong>Tickets by Priority</strong> - Donut chart showing P1 / P2 / P3 / P4 distribution of active tickets</li>
                        <li><strong>Tickets by Status</strong> - Bar chart showing ticket count per status</li>
                        <li><strong>Ticket Categories</strong> - Progress bars showing category distribution</li>
                        <li><strong>Recent Tickets</strong> - Quick list of the latest 5 tickets for fast access</li>
                    </ul>

                    <h3>Online Team Members</h3>
                    <p>A row of avatars in the dashboard shows which team members are currently logged in and active. Hovering over any avatar shows a <strong>popup card</strong> with:</p>
                    <ul>
                        <li>Profile picture (or initials avatar)</li>
                        <li>Full name</li>
                        <li>Role</li>
                        <li>Green presence dot</li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Click any KPI card to jump directly to a filtered ticket list. The SLA Compliance card takes you to tickets that need attention (Breached or At Risk).
                    </div>
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
                    <p>The Ticket List page shows all tickets you have access to, with powerful filtering, sorting, and search options. URL parameters are used to pass filter state from the dashboard and other pages - the list updates automatically when you navigate from a KPI card.</p>

                    <h3>Available Filters</h3>
                    <table>
                        <thead>
                            <tr><th>Filter</th><th>Options</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Status</strong></td><td>Open, Assigned, Acknowledged, In Progress, On Hold, Escalated, Resolved, Verified, Closed, Cancelled, ResolutionRejected</td></tr>
                            <tr><td><strong>Priority</strong></td><td>P1 Critical, P2 High, P3 Medium, P4 Low</td></tr>
                            <tr><td><strong>Category</strong></td><td>All configured categories</td></tr>
                            <tr><td><strong>Site</strong></td><td>Filter by physical location</td></tr>
                            <tr><td><strong>Assigned To</strong></td><td>Filter by engineer name</td></tr>
                            <tr><td><strong>SLA Status</strong></td><td>Breached, At Risk, On Track, <strong>Breached &amp; At Risk</strong> (combined)</td></tr>
                        </tbody>
                    </table>

                    <h3>SLA Status Filter</h3>
                    <p>SLA status is computed in real time from the ticket's actual SLA deadline:</p>
                    <ul>
                        <li>🔴 <strong>Breached</strong> - SLA restoration deadline has passed</li>
                        <li>🟡 <strong>At Risk</strong> - SLA restoration deadline is within the next 4 hours</li>
                        <li>🟢 <strong>On Track</strong> - SLA restoration deadline is more than 4 hours away</li>
                        <li>🔴🟡 <strong>Breached &amp; At Risk</strong> - Combined filter showing all tickets needing immediate attention</li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Clicking the SLA Compliance card on the Dashboard auto-applies the "Breached &amp; At Risk" combined filter so you see all at-risk tickets instantly.
                    </div>
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
                        <li><strong>Category</strong> - Type of issue (Hardware, Software, Connectivity, etc.)</li>
                        <li><strong>Title</strong> - Brief description of the problem</li>
                        <li><strong>Priority</strong> - P1 Critical / P2 High / P3 Medium / P4 Low</li>
                    </ol>

                    <h3>Optional Fields</h3>
                    <ul>
                        <li><strong>Asset</strong> - Link to specific device or equipment</li>
                        <li><strong>Sub-Category</strong> - More specific categorisation (see smart suggestions)</li>
                        <li><strong>Description</strong> - Detailed explanation of the issue</li>
                        <li><strong>Attachments</strong> - Photos or documents</li>
                    </ul>

                    <h3>Sub-Category Smart Suggestions</h3>
                    <p>After selecting a Category, clickable suggestion chips appear below the Sub-Category field. Click a chip to fill it instantly. Changing the Category resets Sub-Category so you always see relevant options.</p>
                    <table>
                        <thead>
                            <tr><th>Category</th><th>Suggested Sub-Categories</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Connectivity</strong></td><td>Fibre Cut, Cable Cut, Cable Damage, Link Down, Latency Issue, Loop Detected</td></tr>
                            <tr><td><strong>Network</strong></td><td>Fibre Cut, Cable Damage, Switch Failure, Port Down, IP Conflict, DNS Issue</td></tr>
                            <tr><td><strong>Hardware</strong></td><td>Camera Malfunction, NVR Failure, Power Supply Failure, Physical Damage</td></tr>
                            <tr><td><strong>Power</strong></td><td>Power Outage, UPS Failure, Overload, Tripped Breaker</td></tr>
                            <tr><td><strong>Software</strong></td><td>Firmware Upgrade, Configuration Error, Software Crash, Login Issue</td></tr>
                        </tbody>
                    </table>

                    <h3>Cable / Fibre Cut Tickets</h3>
                    <p>When Sub-Category contains <strong>Fibre Cut</strong>, <strong>Cable Cut</strong>, or <strong>Cable Damage</strong>, a blue notice appears and the <strong>Cable / Wire Usage</strong> panel is automatically enabled on the ticket detail page.</p>

                    <h3>Auto-Generated</h3>
                    <ul>
                        <li><strong>Ticket Number</strong> - Format: TKT-YYYYMMDD-XXXX</li>
                        <li><strong>SLA Deadlines</strong> - Set automatically based on priority; see SLA Management for timings</li>
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
                            <tr><th>Status</th><th>Description</th><th>Who Sets It</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Open</strong></td><td>Newly created or re-opened; awaiting assignment</td><td>System / Dispatcher</td></tr>
                            <tr><td><strong>Assigned</strong></td><td>Engineer assigned; awaiting acknowledgment</td><td>Admin / Supervisor / Dispatcher</td></tr>
                            <tr><td><strong>Acknowledged</strong></td><td>Assigned engineer has accepted the ticket</td><td>Engineer</td></tr>
                            <tr><td><strong>In Progress</strong></td><td>Work is actively being done on site</td><td>Engineer</td></tr>
                            <tr><td><strong>On Hold</strong></td><td>Paused - waiting for parts, approval, or access</td><td>Engineer / Supervisor</td></tr>
                            <tr><td><strong>Escalated</strong></td><td>Flagged for higher-level attention or L2 involvement</td><td>Supervisor / Admin</td></tr>
                            <tr><td><strong>Resolved</strong></td><td>Issue fixed; awaiting supervisor/client verification</td><td>Engineer</td></tr>
                            <tr><td><strong>ResolutionRejected</strong></td><td>Resolution was reviewed and rejected; ticket must be re-worked</td><td>Supervisor / Admin</td></tr>
                            <tr><td><strong>Verified</strong></td><td>Resolution confirmed as satisfactory</td><td>Supervisor / Admin</td></tr>
                            <tr><td><strong>Closed</strong></td><td>Ticket fully completed and closed</td><td>Admin / Supervisor</td></tr>
                            <tr><td><strong>Cancelled</strong></td><td>Ticket voided (duplicate, raised in error, etc.)</td><td>Admin / Supervisor</td></tr>
                        </tbody>
                    </table>

                    <h3>Re-opening a Ticket</h3>
                    <p>Supervisors and Admins can re-open a Resolved, Verified, or Closed ticket when an issue recurs or was not fully resolved.</p>
                    <p><strong>What happens on re-open:</strong></p>
                    <ul>
                        <li>Ticket returns to <strong>Open</strong> status</li>
                        <li>Previous engineer assignment is <strong>cleared completely</strong></li>
                        <li>Acknowledge and start timestamps are also cleared</li>
                        <li>Root cause and resolution summary are cleared</li>
                        <li>The full workflow must restart: Assign → Acknowledge → In Progress → Resolve</li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Re-opening a ticket does not reset the original SLA deadline - the SLA clock continues from the original ticket creation time, so act quickly after a re-open to avoid a breach.
                    </div>

                    <h3>Escalation</h3>
                    <p>Any active ticket can be escalated by a Supervisor or Admin. Escalated tickets appear highlighted in the ticket list and trigger notifications. The ticket continues its normal workflow alongside the escalation flag.</p>
                `
            },
            {
                id: 'sla-management',
                title: 'SLA Management',
                content: `
                    <h2>SLA Management</h2>
                    <p>Service Level Agreements (SLAs) define the response and resolution time targets for tickets by priority. SLA deadlines are set automatically when a ticket is created, and recalculated if the priority is changed.</p>

                    <h3>Default SLA Targets</h3>
                    <table>
                        <thead>
                            <tr><th>Priority</th><th>Response Target</th><th>Resolution Target</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>P1 - Critical</strong></td><td>15 minutes</td><td>1 hour</td></tr>
                            <tr><td><strong>P2 - High</strong></td><td>30 minutes</td><td>4 hours</td></tr>
                            <tr><td><strong>P3 - Medium</strong></td><td>1 hour</td><td>8 hours</td></tr>
                            <tr><td><strong>P4 - Low</strong></td><td>2 hours</td><td>24 hours</td></tr>
                        </tbody>
                    </table>
                    <p><em>Note: SLA targets are configurable per policy in Settings. Contact your Admin if these differ from your deployment's agreed SLA.</em></p>

                    <h3>SLA Status Definitions</h3>
                    <table>
                        <thead>
                            <tr><th>Status</th><th>Condition</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>🟢 <strong>On Track</strong></td><td>SLA resolution deadline is more than 4 hours away</td></tr>
                            <tr><td>🟡 <strong>At Risk</strong></td><td>SLA resolution deadline is within the next 4 hours (auto-flagged by the system)</td></tr>
                            <tr><td>🔴 <strong>Breached</strong></td><td>SLA resolution deadline has passed and the ticket is still open</td></tr>
                        </tbody>
                    </table>

                    <h3>Automated SLA Warning System</h3>
                    <p>The system checks every 10 minutes and triggers escalating warnings:</p>
                    <table>
                        <thead>
                            <tr><th>Stage</th><th>When</th><th>Who is Notified</th><th>Channel</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>At Risk Flag</strong></td><td>4 hours before breach</td><td>System only (no notification)</td><td>Ticket SLA status updated automatically</td></tr>
                            <tr><td><strong>4-Hour Warning</strong></td><td>Within 4 hours of breach (first warning)</td><td>Assigned engineer + Supervisors + Dispatchers</td><td>Email + in-app ⚠️ notification</td></tr>
                            <tr><td><strong>1-Hour Warning</strong></td><td>Within 1 hour of breach (final warning)</td><td>Assigned engineer + Admins + Supervisors</td><td>Email + in-app 🚨 urgent notification</td></tr>
                            <tr><td><strong>Breach Alert</strong></td><td>Immediately on breach</td><td>Assigned engineer + All Admins</td><td>Email + in-app 🚨 notification</td></tr>
                        </tbody>
                    </table>

                    <h3>SLA Compliance Calculation</h3>
                    <p>The <strong>SLA Compliance %</strong> on the Dashboard is calculated as:</p>
                    <ul>
                        <li><strong>Numerator</strong> - Resolved or Closed tickets where the resolution timestamp was ≤ the SLA restoration deadline</li>
                        <li><strong>Denominator</strong> - All Resolved or Closed tickets that had an SLA deadline set</li>
                    </ul>
                    <p>Tickets without SLA deadlines are excluded from both counts to avoid skewing the figure.</p>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Changing a ticket's priority recalculates the SLA deadline from the current time and resets all warning flags. Use this carefully - it resets the SLA clock, not just the warnings.
                    </div>
                `
            },
            {
                id: 'cable-usage',
                title: 'Cable / Wire Usage',
                content: `
                    <h2>Cable / Wire Usage Panel</h2>
                    <p>This panel appears automatically on the ticket detail page when the ticket's Sub-Category identifies it as a cable or fibre cut issue (e.g. "Fibre Cut", "Cable Cut", "Cable Damage").</p>

                    <h3>What the Panel Shows</h3>
                    <table>
                        <thead>
                            <tr><th>Section</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Available at Site</strong></td><td>Cable and wire assets in Spare status at the ticket's site - showing item name, type, make/model, quantity, and unit</td></tr>
                            <tr><td><strong>Usage History</strong></td><td>All quantities recorded against this ticket, with engineer name, timestamp, quantity consumed, and notes. Running total shown top-right.</td></tr>
                        </tbody>
                    </table>

                    <h3>Recording Cable Usage</h3>
                    <ol>
                        <li>Click <strong>Record Usage</strong> in the panel header.</li>
                        <li>Select the cable item - items with zero stock are shown but disabled.</li>
                        <li>Enter quantity used - unit is shown inline; maximum available is shown as a hint.</li>
                        <li>Add an optional note.</li>
                        <li>Click <strong>Confirm</strong> - stock is deducted immediately.</li>
                    </ol>

                    <h3>Key Rules</h3>
                    <table>
                        <thead>
                            <tr><th>Rule</th><th>Details</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Site-only stock</strong></td><td>Only cable from the ticket's own site is shown</td></tr>
                            <tr><td><strong>No edits</strong></td><td>Usage entries cannot be edited - add a corrective note entry if a wrong quantity was recorded</td></tr>
                            <tr><td><strong>Locked when closed</strong></td><td>Record Usage is disabled once the ticket is Resolved, Verified, Closed, or Cancelled</td></tr>
                        </tbody>
                    </table>
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
                            <tr><td><strong>Camera</strong></td><td>IP cameras, CCTV, ALPR, PTZ</td></tr>
                            <tr><td><strong>NVR / DVR</strong></td><td>Network/Digital Video Recorders</td></tr>
                            <tr><td><strong>Server</strong></td><td>Recording and analytics servers</td></tr>
                            <tr><td><strong>Switch</strong></td><td>Network switches</td></tr>
                            <tr><td><strong>Router</strong></td><td>Network routers and firewalls</td></tr>
                            <tr><td><strong>UPS</strong></td><td>Uninterruptible Power Supply</td></tr>
                            <tr><td><strong>Cable</strong></td><td>Fibre, coaxial, and network cables tracked by quantity/unit</td></tr>
                        </tbody>
                    </table>

                    <h3>Asset Status Values</h3>
                    <ul>
                        <li>🟢 <strong>Operational</strong> - Working normally, installed at site</li>
                        <li>🔴 <strong>Faulty</strong> - Not working, needs repair or replacement</li>
                        <li>🟡 <strong>Under Maintenance</strong> - Currently being serviced</li>
                        <li>🔵 <strong>Spare</strong> - In stock, available for deployment</li>
                        <li>🟠 <strong>In Repair</strong> - Sent for repair via RMA</li>
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
                            <tr><td><strong>Asset Type</strong></td><td>Category of equipment (Camera, NVR, Switch, etc.)</td></tr>
                            <tr><td><strong>Site</strong></td><td>Physical location where the asset is installed or stored</td></tr>
                            <tr><td><strong>Status</strong></td><td>Current operational status</td></tr>
                        </tbody>
                    </table>

                    <h3>Optional Fields</h3>
                    <ul>
                        <li>Device Type (sub-type within the asset type)</li>
                        <li>Serial Number, IP Address, MAC Address</li>
                        <li>Model / Make / Manufacturer</li>
                        <li>Zone within the site</li>
                        <li>Criticality level</li>
                        <li>Warranty Expiry</li>
                        <li>Username / Password (encrypted at rest)</li>
                        <li>Quantity and Unit (for cable/wire items)</li>
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

                    <h3>Import Steps</h3>
                    <ol>
                        <li>Click the <strong>Template</strong> button to download the import template</li>
                        <li>Fill in asset data following the column headers</li>
                        <li>Click the <strong>Import</strong> button to open the import dialog</li>
                        <li>Select your completed CSV or Excel file</li>
                        <li>Review import results and fix any errors</li>
                    </ol>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Always download the latest template to ensure correct column format.
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
                    <p>Sites represent physical locations where surveillance equipment is installed. Sites are the primary organisational unit for assets, tickets, and stock.</p>

                    <h3>Required Fields</h3>
                    <table>
                        <thead>
                            <tr><th>Field</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Site Code</strong></td><td>Unique identifier (e.g., SITE-001)</td></tr>
                            <tr><td><strong>Site Name</strong></td><td>Full descriptive name of the location</td></tr>
                        </tbody>
                    </table>

                    <h3>Optional Fields</h3>
                    <ul>
                        <li>Address, City, State, Country, Pincode</li>
                        <li>Contact Name, Phone, Email</li>
                        <li>SLA Policy (overrides the default SLA for all tickets at this site)</li>
                        <li>Notes and remarks</li>
                    </ul>

                    <h3>Head Office (HO)</h3>
                    <p>One site is designated as <strong>Head Office</strong>. The HO is the central hub for spare stock, RMA receiving, and stock transfers. HO stock is accessible to all Admins and Supervisors across all sites.</p>
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
                    <p>Create and manage user accounts, assign roles, and control site access. Only Admins can create or deactivate users.</p>

                    <h3>Creating a User</h3>
                    <table>
                        <thead>
                            <tr><th>Field</th><th>Required</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Username</strong></td><td>Yes</td><td>Login username (unique across the system)</td></tr>
                            <tr><td><strong>Password</strong></td><td>Yes</td><td>Initial password (user can change from Profile)</td></tr>
                            <tr><td><strong>Full Name</strong></td><td>Yes</td><td>Display name shown throughout the system</td></tr>
                            <tr><td><strong>Email</strong></td><td>Yes</td><td>Used for SLA alerts and notifications</td></tr>
                            <tr><td><strong>Role</strong></td><td>Yes</td><td>Determines base permissions</td></tr>
                            <tr><td><strong>Phone</strong></td><td>No</td><td>Contact number for field coordination</td></tr>
                            <tr><td><strong>Assigned Sites</strong></td><td>No</td><td>Sites the user can access (leave blank for all sites)</td></tr>
                            <tr><td><strong>Profile Picture</strong></td><td>No</td><td>Avatar shown on Dashboard presence row</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'org-chart',
                title: 'Org Chart',
                content: `
                    <h2>Org Chart</h2>
                    <p>The Org Chart provides a visual representation of the organisation's team hierarchy. It shows all active users grouped by role, with their profile pictures, names, and contact details.</p>

                    <h3>What the Chart Shows</h3>
                    <ul>
                        <li>Active users organised by role tier</li>
                        <li>Profile picture or initials avatar</li>
                        <li>Full name and role</li>
                        <li>Email and phone number</li>
                    </ul>

                    <h3>Who Can View It</h3>
                    <p>The Org Chart is visible to all logged-in users. It is a read-only directory - no editing is done from this page. User details must be updated from the User Management page (Admin only).</p>
                `
            },
            {
                id: 'permissions',
                title: 'Role Permissions',
                content: `
                    <h2>Role Permissions Matrix</h2>

                    <h3>Tickets</h3>
                    <table>
                        <thead>
                            <tr><th>Action</th><th>Admin</th><th>Supervisor</th><th>Dispatcher</th><th>Engineer</th><th>SiteClient</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>View All Tickets</td><td>✅</td><td>✅</td><td>✅</td><td>Assigned only</td><td>Own site only</td></tr>
                            <tr><td>Create</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
                            <tr><td>Assign / Reassign</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
                            <tr><td>Resolve</td><td>✅</td><td>✅</td><td>❌</td><td>Assigned only</td><td>❌</td></tr>
                            <tr><td>Close / Verify</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
                            <tr><td>Re-open</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
                            <tr><td>Cancel / Delete</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td></tr>
                        </tbody>
                    </table>

                    <h3>Assets</h3>
                    <table>
                        <thead>
                            <tr><th>Action</th><th>Admin</th><th>Supervisor</th><th>Dispatcher</th><th>Engineer</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>View</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
                            <tr><td>Create / Edit</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
                            <tr><td>Bulk Import</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
                        </tbody>
                    </table>

                    <h3>Stock &amp; RMA</h3>
                    <table>
                        <thead>
                            <tr><th>Action</th><th>Admin</th><th>Supervisor</th><th>Dispatcher</th><th>Engineer</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>View Stock</td><td>✅ All sites</td><td>✅ All sites</td><td>✅</td><td>Own site only</td></tr>
                            <tr><td>Manage Stock / Transfers</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
                            <tr><td>Request RMA</td><td>✅</td><td>✅</td><td>❌</td><td>Assigned tickets only</td></tr>
                            <tr><td>Approve / Process RMA</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'user-rights',
                title: 'Granular User Rights',
                content: `
                    <h2>Granular User Rights</h2>
                    <p>Beyond roles, Admins can assign <strong>granular rights</strong> to individual users on a per-site basis. This allows fine-grained control over what each user can do at specific sites without changing their global role.</p>

                    <h3>Available Rights</h3>
                    <table>
                        <thead>
                            <tr><th>Right</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>ManageTickets</strong></td><td>Create, assign, and manage tickets at the site</td></tr>
                            <tr><td><strong>ManageAssets</strong></td><td>Add and edit assets at the site</td></tr>
                            <tr><td><strong>ManageStock</strong></td><td>View and update stock inventory at the site</td></tr>
                            <tr><td><strong>ViewReports</strong></td><td>Access reports for the site</td></tr>
                            <tr><td><strong>ManageUsers</strong></td><td>Limited user management for the site</td></tr>
                        </tbody>
                    </table>

                    <h3>How to Assign Rights (Admin Only)</h3>
                    <ol>
                        <li>Go to <strong>Admin → User Rights</strong></li>
                        <li>Select the user</li>
                        <li>Select the site</li>
                        <li>Toggle the rights you want to grant</li>
                        <li>Save changes</li>
                    </ol>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Granular rights supplement - they do not override - the user's role-based permissions. A user can only be granted rights that their role supports.
                    </div>
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
                    <p>Generate data exports from tickets, assets, stock, and user activity with date-range and site filtering. All reports download as Excel (.xlsx) files.</p>

                    <h3>Available Reports</h3>
                    <table>
                        <thead>
                            <tr><th>Report</th><th>Description</th><th>Key Fields</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Tickets Report</strong></td><td>All ticket data with SLA status, priority, assignee, and resolution timestamps</td><td>Ticket#, Site, Category, Status, SLA Status, Assigned To, Created, Resolved</td></tr>
                            <tr><td><strong>Employee Status</strong></td><td>Field engineer assignments and workload summary</td><td>Engineer, Role, Tickets Assigned, Open, In Progress, Resolved</td></tr>
                            <tr><td><strong>Asset Status</strong></td><td>Full asset inventory with current status per site</td><td>Asset Code, Type, Site, Status, Make, Model, Serial, IP</td></tr>
                            <tr><td><strong>RMA Report</strong></td><td>All RMA requests with timeline and logistics details</td><td>RMA#, Ticket#, Asset, Status, Engineer, Created, Resolved</td></tr>
                            <tr><td><strong>Spare Stock Report</strong></td><td>Current spare inventory levels by site and device type</td><td>Site, Asset Type, Device Type, Quantity, Status</td></tr>
                            <tr><td><strong>Work Activity Report</strong></td><td>Work log entries per engineer over the date range</td><td>Engineer, Date, Activity Type, Ticket#, Notes, Hours</td></tr>
                            <tr><td><strong>User Activity Report</strong></td><td>Login and action history for all users</td><td>User, Role, Last Login, Actions Logged, Sites Active</td></tr>
                        </tbody>
                    </table>

                    <h3>Filtering Options</h3>
                    <ul>
                        <li><strong>Date Range</strong> - Start and end date for all time-based filters</li>
                        <li><strong>Site</strong> - Limit results to one or all sites</li>
                        <li><strong>Status</strong> - Filter by ticket/asset/RMA status</li>
                        <li><strong>Priority</strong> - Filter tickets by priority level</li>
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
                        <li>Apply desired filters (date range, site, status, etc.)</li>
                        <li>Select the report type from the dropdown</li>
                        <li>Click <strong>"Export Report"</strong></li>
                        <li>The file downloads automatically as Excel (.xlsx)</li>
                    </ol>

                    <h3>Filename Format</h3>
                    <code>[report-type]_report_YYYYMMDD_HHMMSS.xlsx</code>
                    <p>Example: <code>tickets_report_20260121_163000.xlsx</code></p>

                    <h3>Dashboard Summary Export</h3>
                    <p>The Dashboard also offers a quick <strong>Export Summary</strong> button that generates a combined snapshot of current KPIs, ticket counts by status/priority, and SLA compliance - useful for management reporting.</p>
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
                    <p>Track and manage spare inventory across all sites and Head Office. Stock integrates with the Ticket and RMA modules for real-time consumption tracking.</p>

                    <h3>Key Concepts</h3>
                    <table>
                        <thead>
                            <tr><th>Term</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Spare</strong></td><td>A device asset with status "Spare" - available for deployment or RMA replacement</td></tr>
                            <tr><td><strong>Head Office (HO) Stock</strong></td><td>Central inventory held at the Head Office; accessible to all Admins and Supervisors</td></tr>
                            <tr><td><strong>Site Stock</strong></td><td>Spares stored at a specific site; accessible to the site's engineers</td></tr>
                            <tr><td><strong>Asset Type</strong></td><td>Category of device (Camera, NVR, Switch, Cable, etc.)</td></tr>
                            <tr><td><strong>Device Type</strong></td><td>Specific sub-type within an asset type (e.g., ALPR Camera, PTZ Camera)</td></tr>
                        </tbody>
                    </table>

                    <h3>Stock Management Pages</h3>
                    <ul>
                        <li><strong>Stock Dashboard</strong> - Visual analytics for inventory levels, movement trends, and low-stock alerts</li>
                        <li><strong>Stock Inventory</strong> - Full list of all spare items with search, filter, and edit capabilities</li>
                        <li><strong>Transfers</strong> - Track stock movements between sites and HO</li>
                        <li><strong>Requisitions</strong> - Requests for stock allocation or replenishment</li>
                        <li><strong>Movement Log</strong> - Complete audit trail of all stock movements</li>
                    </ul>
                `
            },
            {
                id: 'stock-availability',
                title: 'Stock Availability Panel',
                content: `
                    <h2>Stock Availability Panel</h2>
                    <p>This panel appears on the <strong>Ticket Detail</strong> page when an asset is linked to the ticket. It shows compatible spare items available for replacement, filtered by device type for accuracy.</p>

                    <h3>Role-Based Visibility</h3>
                    <table>
                        <thead>
                            <tr><th>Role</th><th>What is Shown</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Admin / Supervisor</strong></td><td>Stock from all sites with per-site breakdown. Click a site row to expand and view individual spare items.</td></tr>
                            <tr><td><strong>Engineer</strong></td><td>Only stock from the ticket's own site. HO and other-site stock are not shown.</td></tr>
                        </tbody>
                    </table>

                    <h3>Per-Site Breakdown (Admin / Supervisor)</h3>
                    <ul>
                        <li>🟢 <strong>Ticket Site</strong> - Highlighted in green, shown first</li>
                        <li>🟦 <strong>Head Office</strong> - Shown with "HO" badge in blue</li>
                        <li>🟣 <strong>Other Sites</strong> - Shown in purple, sorted alphabetically</li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> The total badge in the panel header shows the overall count of compatible spares. A red badge means no spares are available - consider raising an RMA with Market sourcing.
                    </div>
                `
            },
            {
                id: 'transfers-requisitions',
                title: 'Transfers & Requisitions',
                content: `
                    <h2>Transfers &amp; Requisitions</h2>

                    <h3>Stock Transfers</h3>
                    <p>Transfers move spare items from one location to another. They are created automatically during RMA workflows or manually by Admins/Supervisors.</p>
                    <table>
                        <thead>
                            <tr><th>Transfer Type</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>HO → Site</strong></td><td>Central stock dispatched to a field site (most common for RMA replacement)</td></tr>
                            <tr><td><strong>Site → HO</strong></td><td>Site returning items to Head Office</td></tr>
                            <tr><td><strong>Site → Site</strong></td><td>Direct lateral transfer between two field sites</td></tr>
                        </tbody>
                    </table>

                    <h3>Transfer Statuses</h3>
                    <ul>
                        <li><strong>Pending</strong> - Transfer created, awaiting dispatch</li>
                        <li><strong>Dispatched</strong> - Item shipped, in transit</li>
                        <li><strong>Received</strong> - Destination confirmed receipt; stock updated</li>
                        <li><strong>Cancelled</strong> - Transfer voided</li>
                    </ul>

                    <h3>Requisitions</h3>
                    <p>Requisitions are formal stock requests - typically raised by Dispatchers or Supervisors when a site needs additional spare inventory. Admins review and fulfil requisitions by creating a transfer or procuring from market.</p>
                    <table>
                        <thead>
                            <tr><th>Field</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Requested Item</strong></td><td>Asset type and device type needed</td></tr>
                            <tr><td><strong>Quantity</strong></td><td>Number of units required</td></tr>
                            <tr><td><strong>Destination Site</strong></td><td>Where the items are needed</td></tr>
                            <tr><td><strong>Priority</strong></td><td>Urgency level</td></tr>
                            <tr><td><strong>Notes</strong></td><td>Context or justification for the request</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'cable-stock',
                title: 'Cable Stock',
                content: `
                    <h2>Cable Stock &amp; Ticket Integration</h2>
                    <p>Cable and wire items are tracked by quantity/unit (e.g., metres) and are linked to fibre/cable cut tickets for real-time consumption tracking.</p>

                    <h3>How Cable Items Are Identified</h3>
                    <ul>
                        <li>Unit is set to <code>meter</code>, <code>m</code>, or <code>mtr</code></li>
                        <li>Asset Type or Device Type contains: cable, cabling, cat5, cat6, fiber, fibre, coaxial, wire</li>
                    </ul>

                    <h3>End-to-End Flow</h3>
                    <table>
                        <thead>
                            <tr><th>Step</th><th>Who</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>1</td><td>Dispatcher / Engineer</td><td>Creates a ticket with Sub-Category "Fibre Cut", "Cable Cut", or "Cable Damage"</td></tr>
                            <tr><td>2</td><td>System</td><td>Cable / Wire Usage panel appears automatically on the ticket detail page</td></tr>
                            <tr><td>3</td><td>Engineer</td><td>Records cable usage - selects item, enters quantity, adds note</td></tr>
                            <tr><td>4</td><td>System</td><td>Deducts quantity from the cable asset. Logs the movement linked to the ticket.</td></tr>
                            <tr><td>5</td><td>Stock Manager</td><td>Reviews inventory - items at 0 indicate a reorder is needed</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'stock-rma-integration',
                title: 'Stock & RMA Integration',
                content: `
                    <h2>Stock &amp; RMA Integration</h2>
                    <p>Stock availability directly supports the RMA replacement workflow. When an admin raises a replacement requisition, they select the stock source:</p>

                    <table>
                        <thead>
                            <tr><th>Source</th><th>What Happens</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>🏢 HO Stock</strong></td><td>A stock transfer requisition HO → Site is created automatically</td></tr>
                            <tr><td><strong>📦 Site Stock</strong></td><td>A site-to-site transfer is created from the selected source site</td></tr>
                            <tr><td><strong>🛒 Market</strong></td><td>External purchase - admin dispatches manually after procurement</td></tr>
                        </tbody>
                    </table>

                    <h3>Repaired Item Destination</h3>
                    <table>
                        <thead>
                            <tr><th>Destination</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>📍 Back to Site</strong></td><td>Ship the repaired item back to the original ticket site</td></tr>
                            <tr><td><strong>🏠 HO Stock</strong></td><td>Keep at HO as spare stock - RMA finalised immediately, no shipping step</td></tr>
                            <tr><td><strong>⇄ Other Site</strong></td><td>Ship to a different site selected from dropdown</td></tr>
                        </tbody>
                    </table>
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
                    <p>Handle device repair and replacement workflows within tickets. Each RMA is assigned a unique <strong>RMA number</strong> (format: RMA-YYYYMMDD-XXXX) for easy tracking.</p>

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

                    <h3>RMA Status Definitions</h3>
                    <table>
                        <thead>
                            <tr><th>Status</th><th>Description</th><th>Action By</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Requested</strong></td><td>Engineer submitted RMA request</td><td>Engineer</td></tr>
                            <tr><td><strong>Approved</strong></td><td>Admin approved the request</td><td>Admin</td></tr>
                            <tr><td><strong>Rejected</strong></td><td>Request was denied with reason</td><td>Admin</td></tr>
                            <tr><td><strong>SentToHO</strong></td><td>Faulty item shipped to Head Office</td><td>Engineer</td></tr>
                            <tr><td><strong>SentToServiceCenter</strong></td><td>Item sent directly to service center</td><td>Engineer</td></tr>
                            <tr><td><strong>ReceivedAtHO</strong></td><td>Item received and confirmed at Head Office</td><td>Admin</td></tr>
                            <tr><td><strong>SentForRepairFromHO</strong></td><td>Forwarded from HO to service center</td><td>Admin</td></tr>
                            <tr><td><strong>ItemRepairedAtHO</strong></td><td>Repaired item returned to HO</td><td>Admin</td></tr>
                            <tr><td><strong>ReturnShippedToSite</strong></td><td>Item shipped to destination site</td><td>Admin</td></tr>
                            <tr><td><strong>ReceivedAtSite</strong></td><td>Item received at the destination site</td><td>Engineer</td></tr>
                            <tr><td><strong>Installed</strong></td><td>Device installed and operational</td><td>Engineer</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'rma-records',
                title: 'RMA Records Page',
                content: `
                    <h2>RMA Records Page</h2>
                    <p>The RMA Records page is a standalone view of all RMA requests across all tickets. It is separate from the per-ticket RMA section and is accessible from the Assets menu.</p>

                    <h3>Views</h3>
                    <ul>
                        <li><strong>Grid View</strong> - Card layout showing each RMA with RMA number badge (amber), ticket number, asset details, current status, and site</li>
                        <li><strong>List View</strong> - Compact table layout with the same details for dense scanning</li>
                    </ul>

                    <h3>RMA Number Display</h3>
                    <p>Every RMA card displays the <strong>RMA number</strong> (e.g. RMA-20260115-0001) prominently at the top of the card as an amber badge. This makes it easy to reference in communications and logistics tracking.</p>

                    <h3>Search &amp; Filter</h3>
                    <ul>
                        <li>Search by <strong>RMA number</strong>, ticket number, asset code, or site name</li>
                        <li>Filter by <strong>RMA Status</strong> (all stages)</li>
                        <li>Filter by <strong>Site</strong></li>
                        <li>Filter by <strong>Date Range</strong></li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Use the RMA number when coordinating with logistics or service centers - it uniquely identifies the request independent of the ticket or asset.
                    </div>
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
                        <li>An asset must be linked to the ticket</li>
                        <li>No existing active (non-finalised) RMA for this ticket</li>
                    </ul>

                    <h3>Steps</h3>
                    <ol>
                        <li>Open the ticket detail page</li>
                        <li>Scroll to the <strong>RMA Information</strong> section</li>
                        <li>Click <strong>"Request RMA"</strong></li>
                        <li>Fill in the form:
                            <ul>
                                <li><strong>Reason</strong> - Why repair or replacement is needed</li>
                                <li><strong>Type</strong> - Repair Only or Repair &amp; Replace</li>
                                <li><strong>Notes</strong> - Additional context for the admin</li>
                            </ul>
                        </li>
                        <li>Submit - the admin will be notified for approval</li>
                    </ol>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> The original device credentials (IP address, username, password) are automatically captured in the RMA snapshot so they can be reused during installation after repair.
                    </div>
                `
            },
            {
                id: 'rma-repair-workflow',
                title: 'Repair Workflow Steps',
                content: `
                    <h2>Repair Workflow - Step by Step</h2>

                    <h3>Step 1: Send Faulty Item (Engineer)</h3>
                    <p>After approval, the engineer ships the faulty device. Choose the route:</p>
                    <ul>
                        <li><strong>To HO</strong> - Ship to Head Office for forwarding</li>
                        <li><strong>Direct to Service Center</strong> - Ship directly for repair</li>
                    </ul>
                    <p>Fill in carrier name, tracking number, and remarks.</p>

                    <h3>Step 2: Acknowledge at HO (Admin)</h3>
                    <p>If sent to HO, the admin marks it as "Received at HO" to confirm receipt.</p>

                    <h3>Step 3: Forward to Service Center (Admin)</h3>
                    <p>Admin ships from HO to the service center, entering the service center reference and logistics details.</p>

                    <h3>Step 4: Mark as Repaired (Admin)</h3>
                    <p>When the repaired item returns to HO, admin marks it as "Repaired Item Received at HO". The asset status changes from "In Repair" to "Spare".</p>

                    <h3>Step 5: Select Destination &amp; Ship (Admin)</h3>
                    <table>
                        <thead>
                            <tr><th>Option</th><th>What Happens</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>📍 Back to Site</strong></td><td>Ship to original ticket site. Engineer receives and installs.</td></tr>
                            <tr><td><strong>🏠 HO Stock</strong></td><td>Keep at HO as spare stock. RMA finalised immediately.</td></tr>
                            <tr><td><strong>⇄ Other Site</strong></td><td>Ship to a different selected site.</td></tr>
                        </tbody>
                    </table>

                    <h3>Step 6: Receive at Site (Engineer)</h3>
                    <p>The engineer marks the item as received. Asset is moved to the site's spare stock.</p>

                    <h3>Step 7: Install Device (Engineer)</h3>
                    <p>Engineer installs the device and updates credentials. Original values are pre-filled from the RMA snapshot. Leave the password blank to keep the existing password.</p>
                `
            },
            {
                id: 'rma-replacement',
                title: 'Replacement Workflow',
                content: `
                    <h2>Replacement Workflow</h2>
                    <p>When the RMA type is "Repair &amp; Replace", a parallel replacement workflow runs alongside the repair to minimise downtime.</p>

                    <h3>Raising a Replacement Requisition (Admin)</h3>
                    <ol>
                        <li>In the RMA section, click <strong>"Raise Replacement Requisition"</strong></li>
                        <li>Select a Stock Source:
                            <ul>
                                <li><strong>🏢 HO Stock</strong> - Auto-creates an HO → Site stock transfer</li>
                                <li><strong>📦 Site Stock</strong> - Creates a site-to-site transfer</li>
                                <li><strong>🛒 Market</strong> - External purchase; dispatch manually after procurement</li>
                            </ul>
                        </li>
                        <li>Add remarks and submit</li>
                    </ol>

                    <h3>Dispatching &amp; Receiving</h3>
                    <p>Once the replacement item is ready, admin enters logistics details and dispatches. The site engineer marks receipt, then completes the installation with updated device credentials.</p>
                `
            }
        ]
    },
    {
        id: 'fieldops',
        title: 'Field Operations',
        icon: Map,
        subsections: [
            {
                id: 'fieldops-overview',
                title: 'Field Ops Overview',
                content: `
                    <h2>Field Operations</h2>
                    <p>The Field Operations module manages end-to-end CCTV and surveillance installation projects - from planning and site surveying through device installation, vendor coordination, and daily progress reporting.</p>

                    <h3>Key Sub-Modules</h3>
                    <table>
                        <thead>
                            <tr><th>Module</th><th>Purpose</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Projects</strong></td><td>Top-level installation project with assigned PM, team, and timeline</td></tr>
                            <tr><td><strong>Activities</strong></td><td>Work items and tasks within a project</td></tr>
                            <tr><td><strong>Device Installations</strong></td><td>Track every device installed per project zone</td></tr>
                            <tr><td><strong>PM Daily Logs</strong></td><td>End-of-day progress reports submitted by the Project Manager</td></tr>
                            <tr><td><strong>Vendor Work Logs</strong></td><td>Track vendor activities - road digging, cable laying, trench status</td></tr>
                            <tr><td><strong>Challenges</strong></td><td>Issue/blocker log with severity levels and admin escalation</td></tr>
                        </tbody>
                    </table>

                    <h3>Access Control</h3>
                    <p>Field Operations uses <strong>assignment-based access</strong> - no separate role is required. Access is granted by being assigned to a project:</p>
                    <ul>
                        <li><strong>assignedPM</strong> - Project Manager: full control over the project and daily logs</li>
                        <li><strong>teamMembers</strong> - Team members: can view and update project activities</li>
                        <li><strong>assignedVendors</strong> - Vendor users: can submit vendor work logs</li>
                        <li><strong>Admin / Supervisor</strong> - Full access to all projects</li>
                    </ul>
                `
            },
            {
                id: 'fieldops-projects',
                title: 'Projects',
                content: `
                    <h2>Field Operations Projects</h2>
                    <p>A project is the top-level container for a CCTV/surveillance installation engagement. Each project has a unique auto-generated number in format <strong>PRJ-YYYYMMDD-XXXX</strong>.</p>

                    <h3>Creating a Project (Admin / Supervisor)</h3>
                    <table>
                        <thead>
                            <tr><th>Field</th><th>Required</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Project Name</strong></td><td>Yes</td><td>Descriptive name for the installation project</td></tr>
                            <tr><td><strong>Client / Site</strong></td><td>Yes</td><td>Link to the site where installation is happening</td></tr>
                            <tr><td><strong>Assigned PM</strong></td><td>Yes</td><td>Project Manager responsible for daily logs and coordination</td></tr>
                            <tr><td><strong>Team Members</strong></td><td>No</td><td>Engineers and field staff assigned to the project</td></tr>
                            <tr><td><strong>Assigned Vendors</strong></td><td>No</td><td>External vendor companies or contacts</td></tr>
                            <tr><td><strong>Start Date / End Date</strong></td><td>No</td><td>Planned project timeline</td></tr>
                            <tr><td><strong>Description</strong></td><td>No</td><td>Scope and objectives of the project</td></tr>
                        </tbody>
                    </table>

                    <h3>Project Status</h3>
                    <ul>
                        <li><strong>Planning</strong> - Project created, not yet started</li>
                        <li><strong>Active</strong> - Work in progress</li>
                        <li><strong>On Hold</strong> - Paused (access, approvals, weather, etc.)</li>
                        <li><strong>Completed</strong> - All work done and signed off</li>
                        <li><strong>Cancelled</strong> - Project voided</li>
                    </ul>

                    <h3>Project Zones</h3>
                    <p>Projects can be divided into <strong>zones</strong> - geographic areas within the installation site. Zones can have GPS boundary points defined, and device installations are tracked per zone.</p>
                `
            },
            {
                id: 'fieldops-devices',
                title: 'Device Installations',
                content: `
                    <h2>Device Installations</h2>
                    <p>Track every device installed as part of a field operations project. Device installations are linked to a project zone and record full technical details of the installed equipment.</p>

                    <h3>Supported Device Types</h3>
                    <ul>
                        <li>IP Camera (Fixed, PTZ)</li>
                        <li>NVR (Network Video Recorder)</li>
                        <li>DVR (Digital Video Recorder)</li>
                        <li>PTZ Controller</li>
                        <li>Network Switch / PoE Switch</li>
                        <li>Cabling &amp; conduit</li>
                    </ul>

                    <h3>Installation Record Fields</h3>
                    <table>
                        <thead>
                            <tr><th>Field</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Device Type</strong></td><td>Category of installed device</td></tr>
                            <tr><td><strong>Make / Model</strong></td><td>Manufacturer and model number</td></tr>
                            <tr><td><strong>Serial Number</strong></td><td>Device serial for asset tracking</td></tr>
                            <tr><td><strong>IP Address</strong></td><td>Assigned IP on the site network</td></tr>
                            <tr><td><strong>Zone</strong></td><td>Project zone where the device is installed</td></tr>
                            <tr><td><strong>Installation Date</strong></td><td>Date of physical installation</td></tr>
                            <tr><td><strong>Cable Details</strong></td><td>Cable type, length, and routing notes</td></tr>
                            <tr><td><strong>Network Details</strong></td><td>Port, VLAN, PoE info</td></tr>
                            <tr><td><strong>Photos</strong></td><td>Installation photos uploaded via mobile or desktop</td></tr>
                            <tr><td><strong>Status</strong></td><td>Installed, Tested, Commissioned, Faulty</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'fieldops-pm-logs',
                title: 'PM Daily Logs',
                content: `
                    <h2>PM Daily Logs</h2>
                    <p>The Project Manager (PM) submits a <strong>Daily Log</strong> at the end of each working day summarising on-site progress, resources, and issues encountered. A reminder email is automatically sent to PMs at <strong>7 PM daily</strong> if no log has been submitted for the day.</p>

                    <h3>Log Fields</h3>
                    <table>
                        <thead>
                            <tr><th>Field</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Log Date</strong></td><td>Date of the work day</td></tr>
                            <tr><td><strong>Progress Summary</strong></td><td>What was accomplished today</td></tr>
                            <tr><td><strong>Workers Present</strong></td><td>Number of workers on site</td></tr>
                            <tr><td><strong>GPS Location</strong></td><td>Site GPS coordinates at time of submission</td></tr>
                            <tr><td><strong>Photos</strong></td><td>Progress photos uploaded from the field</td></tr>
                            <tr><td><strong>Issues / Remarks</strong></td><td>Any blockers, weather, or access issues</td></tr>
                        </tbody>
                    </table>

                    <h3>24-Hour Lock</h3>
                    <p>PM Daily Logs can be edited for <strong>24 hours</strong> after submission. After that, they are automatically locked by the system and cannot be modified. This ensures an accurate, tamper-proof project record.</p>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Submit the daily log from the field using the mobile browser for automatic GPS capture. The coordinates are embedded in the log record for audit purposes.
                    </div>
                `
            },
            {
                id: 'fieldops-vendor-logs',
                title: 'Vendor Work Logs',
                content: `
                    <h2>Vendor Work Logs</h2>
                    <p>Vendor Work Logs capture the civil and ground work performed by external vendors - such as road digging, cable laying, and trench construction. They are submitted by assigned vendor users or the PM on behalf of the vendor.</p>

                    <h3>Log Fields</h3>
                    <table>
                        <thead>
                            <tr><th>Field</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Work Date</strong></td><td>Date of the vendor work session</td></tr>
                            <tr><td><strong>Vendor Name</strong></td><td>Company or contractor performing the work</td></tr>
                            <tr><td><strong>Work Type</strong></td><td>Road Digging, Cable Laying, Trench, Conduit, Other</td></tr>
                            <tr><td><strong>Area Covered</strong></td><td>GPS area boundaries or address description</td></tr>
                            <tr><td><strong>Length / Quantity</strong></td><td>Metres dug, metres of cable laid, etc.</td></tr>
                            <tr><td><strong>Trench Status</strong></td><td>Open / Partially Closed / Fully Closed</td></tr>
                            <tr><td><strong>Remarks</strong></td><td>Site conditions, access issues, materials used</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'fieldops-challenges',
                title: 'Challenges',
                content: `
                    <h2>Challenges &amp; Blockers</h2>
                    <p>The Challenges module is a structured issue log for field operations projects. Any team member can raise a challenge - from a minor access delay to a critical site risk requiring admin escalation.</p>

                    <h3>Severity Levels</h3>
                    <table>
                        <thead>
                            <tr><th>Level</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>🟢 <strong>Low</strong></td><td>Minor issue; team can work around it</td></tr>
                            <tr><td>🟡 <strong>Medium</strong></td><td>Issue causing delays; PM action required</td></tr>
                            <tr><td>🟠 <strong>High</strong></td><td>Significant blocker; supervisor involvement needed</td></tr>
                            <tr><td>🔴 <strong>Critical</strong></td><td>Work cannot proceed; immediate admin escalation</td></tr>
                        </tbody>
                    </table>

                    <h3>Challenge Record</h3>
                    <ul>
                        <li><strong>Title</strong> - Short description of the issue</li>
                        <li><strong>Description</strong> - Full detail and impact</li>
                        <li><strong>Severity</strong> - See levels above</li>
                        <li><strong>Raised By</strong> - Team member who flagged the issue</li>
                        <li><strong>Status</strong> - Open, In Progress, Resolved</li>
                        <li><strong>Resolution Notes</strong> - How the challenge was addressed</li>
                        <li><strong>Photos</strong> - Supporting evidence</li>
                    </ul>
                `
            }
        ]
    },
    {
        id: 'worklog',
        title: 'Work Log',
        icon: ClipboardList,
        subsections: [
            {
                id: 'worklog-overview',
                title: 'Work Log Overview',
                content: `
                    <h2>Work Log</h2>
                    <p>The Work Log module provides a daily activity record for engineers and field staff. It captures both <strong>system-generated entries</strong> (automatic on ticket status changes) and <strong>manual entries</strong> added by the engineer.</p>

                    <h3>Auto-Logged Events</h3>
                    <p>The system automatically creates work log entries when key ticket actions occur:</p>
                    <ul>
                        <li>Ticket acknowledged</li>
                        <li>Work started (moved to In Progress)</li>
                        <li>Ticket placed On Hold (with reason)</li>
                        <li>Ticket resolved (with resolution summary)</li>
                        <li>RMA requested or status changed</li>
                    </ul>

                    <h3>Manual Entries</h3>
                    <p>Engineers can add their own work log entries for activities not automatically captured:</p>
                    <table>
                        <thead>
                            <tr><th>Field</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Date</strong></td><td>Date of the activity</td></tr>
                            <tr><td><strong>Activity Type</strong></td><td>Site Visit, Remote Support, Documentation, Meeting, Travel, Other</td></tr>
                            <tr><td><strong>Linked Ticket</strong></td><td>Optional - link the entry to a specific ticket</td></tr>
                            <tr><td><strong>Hours Spent</strong></td><td>Time spent on the activity</td></tr>
                            <tr><td><strong>Notes</strong></td><td>Description of work done</td></tr>
                        </tbody>
                    </table>

                    <h3>Viewing Work Logs</h3>
                    <ul>
                        <li><strong>Engineers</strong> - See their own work log only</li>
                        <li><strong>Supervisors / Admins</strong> - Can view work logs for all engineers, filterable by engineer, date range, and activity type</li>
                    </ul>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Work log data feeds into the <strong>Work Activity Report</strong> in the Reports module - useful for timesheet audits and billing summaries.
                    </div>
                `
            }
        ]
    },
    {
        id: 'admin',
        title: 'Admin',
        icon: Shield,
        subsections: [
            {
                id: 'admin-overview',
                title: 'Admin Overview',
                content: `
                    <h2>Admin Module</h2>
                    <p>The Admin module provides system-level management features accessible only to users with the <strong>Admin</strong> role. It covers client onboarding, granular permission management, and system configuration beyond what is available in Settings.</p>

                    <h3>Admin Sections</h3>
                    <table>
                        <thead>
                            <tr><th>Section</th><th>Purpose</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Client Registrations</strong></td><td>Manage client account onboarding and their site access</td></tr>
                            <tr><td><strong>User Rights</strong></td><td>Assign granular per-site permissions to individual users</td></tr>
                            <tr><td><strong>Notification Management</strong></td><td>Send rich HTML notifications to specific roles or sites</td></tr>
                            <tr><td><strong>System Settings</strong></td><td>SLA policies, lookup values, and system configuration</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'client-registrations',
                title: 'Client Registrations',
                content: `
                    <h2>Client Registrations</h2>
                    <p>Client Registrations manages the onboarding of external clients (SiteClient and ClientViewer users) who need access to the system to view their site's tickets and assets.</p>

                    <h3>Registration Workflow</h3>
                    <ol>
                        <li>Admin reviews a pending client registration request</li>
                        <li>Admin verifies the client's identity and site association</li>
                        <li>Admin approves and activates the account - or rejects with a reason</li>
                        <li>The client receives login credentials and can access their designated sites</li>
                    </ol>

                    <h3>Client Access Levels</h3>
                    <table>
                        <thead>
                            <tr><th>Role</th><th>What They Can See</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>SiteClient</strong></td><td>Tickets and assets for their assigned sites; can create tickets</td></tr>
                            <tr><td><strong>ClientViewer</strong></td><td>Read-only access to tickets and assets for their assigned sites</td></tr>
                        </tbody>
                    </table>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Client accounts are strictly scoped to their assigned sites - they cannot see any data from sites they are not linked to.
                    </div>
                `
            },
            {
                id: 'admin-user-rights',
                title: 'User Rights Management',
                content: `
                    <h2>User Rights Management</h2>
                    <p>Beyond role-based permissions, Admins can grant or revoke <strong>granular rights</strong> on a per-user, per-site basis. This is the primary tool for customising access without changing a user's global role.</p>

                    <h3>How to Manage Rights</h3>
                    <ol>
                        <li>Go to <strong>Admin → User Rights</strong></li>
                        <li>Select the user from the list</li>
                        <li>Select the site you want to configure</li>
                        <li>Toggle the desired rights on or off</li>
                        <li>Click <strong>Save</strong></li>
                    </ol>

                    <h3>Available Rights</h3>
                    <table>
                        <thead>
                            <tr><th>Right</th><th>Grants the user ability to…</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>ManageTickets</strong></td><td>Create, assign, and update tickets at this site</td></tr>
                            <tr><td><strong>ManageAssets</strong></td><td>Add and edit assets at this site</td></tr>
                            <tr><td><strong>ManageStock</strong></td><td>View and update stock inventory at this site</td></tr>
                            <tr><td><strong>ViewReports</strong></td><td>Access reports filtered to this site</td></tr>
                            <tr><td><strong>ManageUsers</strong></td><td>Limited user management scoped to this site</td></tr>
                        </tbody>
                    </table>

                    <p>Rights are <em>additive</em> - they extend a user's capabilities, never reduce them below what the role already grants.</p>
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
                    <p>Configure system behaviour, manage lookup values, and set up SLA policies.</p>

                    <h3>Available Settings</h3>
                    <table>
                        <thead>
                            <tr><th>Setting Area</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>General</strong></td><td>System name, timezone, date format</td></tr>
                            <tr><td><strong>SLA Policies</strong></td><td>Configure response and resolution targets per priority level. Applied per site or as a global default.</td></tr>
                            <tr><td><strong>Lookup Values</strong></td><td>Manage predefined dropdown values - ticket categories, sub-categories, device types, asset types</td></tr>
                            <tr><td><strong>Notification Settings</strong></td><td>Email sender configuration, notification enable/disable per event type</td></tr>
                        </tbody>
                    </table>

                    <h3>SLA Policy Configuration</h3>
                    <p>Each SLA policy defines response and resolution targets for P1–P4 priorities. Policies can be assigned globally or per site - site-level policies take precedence over the global default.</p>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> The <strong>default SLA policy</strong> applies to all tickets at sites that do not have a specific SLA policy assigned. Always configure the default to match your contractual SLA obligations.
                    </div>
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
                    <p>TicketOps delivers real-time in-app notifications via WebSocket and email notifications via the configured email provider. The notification bell in the top navigation shows your unread count.</p>

                    <h3>In-App Notification Types</h3>
                    <table>
                        <thead>
                            <tr><th>Type</th><th>Triggered When</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>🎫 <strong>Ticket Assigned</strong></td><td>A ticket is assigned to you</td></tr>
                            <tr><td>📝 <strong>Ticket Updated</strong></td><td>A status change on a ticket you're involved in</td></tr>
                            <tr><td>💬 <strong>Comment Added</strong></td><td>New comment on a ticket you're assigned to or watching</td></tr>
                            <tr><td>⚠️ <strong>SLA Warning - 4 Hours</strong></td><td>Your assigned ticket will breach SLA in ~4 hours</td></tr>
                            <tr><td>🚨 <strong>SLA Warning - 1 Hour</strong></td><td>Your assigned ticket will breach SLA in ~1 hour (urgent)</td></tr>
                            <tr><td>🔴 <strong>SLA Breached</strong></td><td>A ticket you're assigned to has breached SLA</td></tr>
                            <tr><td>🔴 <strong>SLA Breached - Admin Alert</strong></td><td>Any ticket in the system has breached SLA (Admins only)</td></tr>
                            <tr><td>👤 <strong>Assignment</strong></td><td>Ticket assigned or reassigned</td></tr>
                            <tr><td>🔄 <strong>RMA Update</strong></td><td>RMA status changed on your ticket</td></tr>
                        </tbody>
                    </table>

                    <h3>Email Notifications</h3>
                    <table>
                        <thead>
                            <tr><th>Event</th><th>Recipients</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>Ticket assigned</td><td>Assigned engineer</td></tr>
                            <tr><td>SLA 4-hour warning</td><td>Assigned engineer + all Supervisors &amp; Dispatchers</td></tr>
                            <tr><td>SLA 1-hour warning</td><td>Assigned engineer + all Admins &amp; Supervisors</td></tr>
                            <tr><td>SLA breached</td><td>Assigned engineer + all Admins</td></tr>
                            <tr><td>PM daily log reminder (7 PM)</td><td>Assigned PM if no log submitted today</td></tr>
                        </tbody>
                    </table>
                `
            },
            {
                id: 'notification-management',
                title: 'Notification Management',
                content: `
                    <h2>Notification Management (Admin Only)</h2>
                    <p>Admins can compose and send <strong>custom notifications</strong> to specific users, roles, or sites - useful for system announcements, maintenance windows, or important alerts.</p>

                    <h3>Creating a Notification</h3>
                    <ol>
                        <li>Go to <strong>Notifications → Manage Notifications</strong> (Admin menu)</li>
                        <li>Click <strong>"New Notification"</strong></li>
                        <li>Fill in:
                            <ul>
                                <li><strong>Title</strong> - Short subject line</li>
                                <li><strong>Message</strong> - Full message body (rich HTML editor supported)</li>
                                <li><strong>Type</strong> - Info, Warning, Error, Success</li>
                                <li><strong>Target Audience</strong> - All users, specific roles, specific users, or users at specific sites</li>
                            </ul>
                        </li>
                        <li>Click <strong>"Send"</strong> - delivered in real time to all targeted users who are online; queued for offline users</li>
                    </ol>

                    <h3>Notification History</h3>
                    <p>All sent notifications are stored with sender, timestamp, target audience, and delivery status. Admins can view and search the notification history from the management page.</p>

                    <div class="tip-box">
                        <strong>💡 Tip:</strong> Use the <strong>Warning</strong> type for planned maintenance alerts - these render with a yellow banner in the notification panel, drawing immediate attention.
                    </div>
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
                    <p>Manage your personal account settings, contact details, and security preferences from the Profile page (top-right avatar → Profile).</p>

                    <h3>Editable Fields</h3>
                    <ul>
                        <li>Full Name (display name throughout the system)</li>
                        <li>Email Address (used for SLA alert emails)</li>
                        <li>Phone Number</li>
                        <li>Profile Picture (shown on Dashboard presence and hover cards)</li>
                    </ul>

                    <h3>Changing Password</h3>
                    <ol>
                        <li>Go to the Profile page</li>
                        <li>Click <strong>"Change Password"</strong></li>
                        <li>Enter your Current Password</li>
                        <li>Enter the New Password (twice to confirm)</li>
                        <li>Click <strong>"Update Password"</strong></li>
                    </ol>

                    <h3>Theme</h3>
                    <p>Switch between <strong>Light</strong>, <strong>Dark</strong>, and <strong>System</strong> (follows your OS preference) from the Profile page. The theme choice is saved and persists across sessions.</p>

                    <h3>Notification Preferences</h3>
                    <p>Configure which notifications you receive:</p>
                    <ul>
                        <li><strong>In-App</strong> - Ticket assignments, status changes, SLA warnings (real-time)</li>
                        <li><strong>Email</strong> - New assignments, SLA alerts, daily digests</li>
                    </ul>
                `
            }
        ]
    }
];

export default function Help() {
    const [expandedSection, setExpandedSection] = useState('getting-started');
    const [activeSubsection, setActiveSubsection] = useState('whats-new');
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
                smoothNavigate(section.subsections[0].id);
            }
        }
    };

    const handleSubsectionClick = (subsectionId) => {
        smoothNavigate(subsectionId);
    };

    const smoothNavigate = (subsectionId) => {
        if (activeSubsection === subsectionId) return;

        setIsTransitioning(true);

        setTimeout(() => {
            setActiveSubsection(subsectionId);

            if (contentRef.current) {
                contentRef.current.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }

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
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getCurrentContent()) }}
                    />
                </main>
            </div>
        </div>
    );
}
