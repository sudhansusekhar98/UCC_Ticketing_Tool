import 'dotenv/config';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendViaBrevo = async ({ to, bcc, subject, html }) => {
  const toList = Array.isArray(to)
    ? to.map(email => ({ email }))
    : [{ email: to }];

  const body = {
    sender: {
      name: 'TicketOps',
      email: process.env.BREVO_SENDER_EMAIL,
    },
    subject,
    htmlContent: html,
  };

  if (bcc) {
    const bccList = Array.isArray(bcc)
      ? bcc.map(email => ({ email }))
      : [{ email: bcc }];
    body.to = [{ email: process.env.BREVO_SENDER_EMAIL }];
    body.bcc = bccList;
  } else {
    body.to = toList;
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Brevo API error ${response.status}: ${errorData.message || response.statusText}`);
  }

  return response.json();
};

// Email template wrapper
const emailTemplate = (content, title) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7fa;
      margin: 0;
      padding: 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .email-header {
      background-color: #0f172a;
      border-top: 3px solid #2563eb;
      color: #ffffff;
      padding: 16px 30px;
      text-align: left;
    }
    .email-header .brand {
      margin: 0 0 2px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .email-header h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    .email-body {
      padding: 30px;
      color: #333333;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      margin: 20px 0;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 500;
    }
    .email-footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin: 15px 0;
    }
    .info-box strong {
      color: #2563eb;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #ffffff;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 14px;
    }
    .data-table th {
      text-align: left;
      padding: 8px 12px;
      background-color: #f8f9fa;
      color: #4a5568;
      border-bottom: 1px solid #edf2f7;
      width: 40%;
    }
    .data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #edf2f7;
      color: #2d3748;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <p class="brand">TicketOps</p>
      <h1>${title}</h1>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p>This is an automated email from TicketOps. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} VL Access. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

import NotificationLog from '../models/NotificationLog.model.js';

const PRIORITY_COLORS = { P1: '#dc2626', P2: '#ea580c', P3: '#ca8a04', P4: '#16a34a' };
const priorityBadge = (priority) => `<span class="badge" style="background:${PRIORITY_COLORS[priority] || '#64748b'};">${priority || 'N/A'}</span>`;

/**
 * Helper to log notifications to DB
 */
const logNotification = async (recipient, subject, content, category, relatedTicketId = null, status = 'Sent', error = null, recipientId = null) => {
  try {
    await NotificationLog.create({
      recipient,
      recipientId,
      subject,
      content,
      category,
      relatedTicketId,
      status,
      error
    });
  } catch (err) {
    console.error('Error logging notification:', err);
  }
};

/**
 * Send welcome email when a new account is created
 */
export const sendAccountCreationEmail = async (user, tempPassword) => {
  try {

    const content = `
      <p>Hello <strong>${user.fullName || user.username}</strong>,</p>
      <p>Welcome to TicketOps! Your account has been successfully created.</p>
      
      <table class="data-table">
        <tr><th>Username</th><td>${user.username}</td></tr>
        <tr><th>Email</th><td>${user.email}</td></tr>
        <tr><th>Temporary Password</th><td><code>${tempPassword}</code></td></tr>
        <tr><th>Role</th><td>${user.role}</td></tr>
      </table>
      
      <p>For security reasons, please change your password after your first login.</p>
      <p>You can access the system by clicking the button below:</p>
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/login" class="btn" style="color: white !important; text-decoration: none;">Login to System</a>
      </div>
      
      <p>If you have any questions or need assistance, please contact your system administrator.</p>
      
      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = 'Welcome to TicketOps - Account Created';
    await sendViaBrevo({
      to: user.email,
      subject,
      html: emailTemplate(content, 'Account Created'),
    });

    console.log(`Account creation email sent to ${user.email}`);
    await logNotification(user.email, subject, content, 'Account', null, 'Sent', null, user._id);
  } catch (error) {
    console.error('Error sending account creation email:', error);
    await logNotification(user.email, 'Welcome Email', 'Failed to send', 'Account', null, 'Failed', error.message, user._id);
  }
};

/**
 * Send email when a device is assigned to an engineer for configuration
 */
export const sendDeviceAssignmentEmail = async (device, assignedUser, assignedBy, project) => {
  try {

    const content = `
      <p>Hello <strong>${assignedUser.fullName || assignedUser.username}</strong>,</p>
      <p>A device has been assigned to you for configuration and testing.</p>

      <table class="data-table">
        <tr><th>Device Type</th><td>${device.deviceType || device.assetType}</td></tr>
        <tr><th>Make/Model</th><td>${device.make} ${device.model}</td></tr>
        <tr><th>Serial Number</th><td>${device.serialNumber || 'N/A'}</td></tr>
        <tr><th>Project</th><td>${project?.projectName || project?.projectNumber || 'N/A'}</td></tr>
        <tr><th>Zone</th><td>${device.zoneId?.zoneName || 'N/A'}</td></tr>
        <tr><th>Current Status</th><td>${device.status}</td></tr>
        <tr><th>Assigned By</th><td>${assignedBy?.fullName || 'System'}</td></tr>
      </table>

      ${device.notes ? `<p><strong>Notes:</strong></p><div class="info-box">${device.notes}</div>` : ''}

      <p>Please log in to the system to complete the configuration. Once finished, <strong>mark the device as tested and configured</strong> so it can be deployed as an operational asset.</p>

      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/fieldops/devices/my-assignments" class="btn" style="color: white !important; text-decoration: none;">View My Assignments</a>
      </div>

      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = `Device Assigned: ${device.deviceType} - ${project?.projectNumber || 'Project'}`;
    await sendViaBrevo({
      to: assignedUser.email,
      subject,
      html: emailTemplate(content, 'Device Assigned'),
    });

    console.log(`Device assignment email sent to ${assignedUser.email}`);
    await logNotification(assignedUser.email, subject, content, 'DeviceAssignment', null, 'Sent', null, assignedUser._id);
  } catch (error) {
    console.error('Error sending device assignment email:', error);
    await logNotification(assignedUser.email, 'Device Assignment', 'Failed', 'DeviceAssignment', null, 'Failed', error.message, assignedUser._id);
  }
};

/**
 * Send email when a ticket is assigned to an engineer
 */
export const sendTicketAssignmentEmail = async (ticket, assignedUser, assignedBy) => {
  try {

    const content = `
      <p>Hello <strong>${assignedUser.fullName || assignedUser.username}</strong>,</p>
      <p>A new ticket has been assigned to you.</p>
      
      <table class="data-table">
        <tr><th>Ticket ID</th><td>${ticket.ticketNumber}</td></tr>
        <tr><th>Subject</th><td>${ticket.title}</td></tr>
        <tr><th>Priority</th><td>${priorityBadge(ticket.priority)}</td></tr>
        <tr><th>Status</th><td>${ticket.status}</td></tr>
        <tr><th>Site</th><td>${ticket.siteId?.siteName || ticket.site?.name || 'N/A'}</td></tr>
        <tr><th>Expected Resolution</th><td>${ticket.slaRestoreDue ? new Date(ticket.slaRestoreDue).toLocaleString() : 'N/A'}</td></tr>
        <tr><th>Assigned By</th><td>${assignedBy?.fullName || 'System'}</td></tr>
      </table>

      <p><strong>Description:</strong></p>
      <div class="info-box">${ticket.description || 'No description provided'}</div>
      
      <p>Please acknowledge and start working on this ticket as soon as possible.</p>
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/tickets/${ticket._id}" class="btn" style="color: white !important; text-decoration: none;">View Ticket</a>
      </div>
      
      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = `Ticket Assigned: ${ticket.ticketNumber} - ${ticket.title}`;
    await sendViaBrevo({
      to: assignedUser.email,
      subject,
      html: emailTemplate(content, 'Ticket Assigned'),
    });

    console.log(`Ticket assignment email sent to ${assignedUser.email}`);
    await logNotification(assignedUser.email, subject, content, 'TicketAssignment', ticket._id, 'Sent', null, assignedUser._id);
  } catch (error) {
    console.error('Error sending ticket assignment email:', error);
    await logNotification(assignedUser.email, 'Ticket Assignment', 'Failed', 'TicketAssignment', ticket._id, 'Failed', error.message, assignedUser._id);
  }
};

/**
 * Send email when a ticket is escalated
 */
export const sendTicketEscalationEmail = async (ticket, escalatedToUser, escalatedBy, escalationReason) => {
  try {

    const content = `
      <p>Hello <strong>${escalatedToUser.fullName || escalatedToUser.username}</strong>,</p>
      <p>A ticket has been escalated to you and requires your immediate attention.</p>
      
      <table class="data-table">
        <tr><th>Ticket ID</th><td>${ticket.ticketNumber}</td></tr>
        <tr><th>Subject</th><td>${ticket.title}</td></tr>
        <tr><th>Priority</th><td>${priorityBadge(ticket.priority)}</td></tr>
        <tr><th>Status</th><td>${ticket.status}</td></tr>
        <tr><th>Escalation Level</th><td><strong>Level ${ticket.escalationLevel}</strong></td></tr>
        <tr><th>Site</th><td>${ticket.siteId?.siteName || ticket.site?.name || 'N/A'}</td></tr>
        <tr><th>Expected Resolution</th><td>${ticket.slaRestoreDue ? new Date(ticket.slaRestoreDue).toLocaleString() : 'N/A'}</td></tr>
        <tr><th>Escalated By</th><td>${escalatedBy?.fullName || 'System'}</td></tr>
      </table>
      
      <p><strong>Escalation Reason:</strong></p>
      <div class="info-box" style="border-left-color: #dc3545;">${escalationReason || 'No reason provided'}</div>
      
      <p><strong>Original Description:</strong></p>
      <div class="info-box">${ticket.description || 'No description provided'}</div>
      
      <p><strong style="color: #dc3545;">This ticket requires your immediate attention!</strong></p>
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/tickets/${ticket._id}" class="btn" style="color: white !important; text-decoration: none; background-color: #dc3545;">View Urgent Ticket</a>
      </div>
      
      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = `ESCALATED: ${ticket.ticketNumber} - ${ticket.title}`;
    await sendViaBrevo({
      to: escalatedToUser.email,
      subject,
      html: emailTemplate(content, 'Ticket Escalated'),
    });

    console.log(`Ticket escalation email sent to ${escalatedToUser.email}`);
    await logNotification(escalatedToUser.email, subject, content, 'TicketEscalation', ticket._id, 'Sent', null, escalatedToUser._id);
  } catch (error) {
    console.error('Error sending ticket escalation email:', error);
    await logNotification(escalatedToUser.email, 'Ticket Escalation', 'Failed', 'TicketEscalation', ticket._id, 'Failed', error.message, escalatedToUser._id);
  }
};

/**
 * Send email when an RMA request is created
 */
export const sendRMACreationEmail = async (rmaRequest, ticket, requestedBy, notifyUsers = []) => {
  try {

    // Send to all users who should be notified (admin, logistics, etc.)
    const recipients = notifyUsers.map(user => user.email).filter(Boolean);

    if (recipients.length === 0) {
      console.log('No recipients for RMA notification');
      return;
    }

    const content = `
      <p>Hello,</p>
      <p>A new RMA (Return Merchandise Authorization) request has been generated.</p>
      
      <table class="data-table">
        <tr><th>RMA Number</th><td>${rmaRequest.rmaNumber}</td></tr>
        <tr><th>Related Ticket</th><td>${ticket?.ticketNumber || 'N/A'}</td></tr>
        <tr><th>Asset Code</th><td>${rmaRequest.asset?.name || 'N/A'}</td></tr>
        <tr><th>Asset Type</th><td>${rmaRequest.asset?.assetType || 'N/A'}</td></tr>
        <tr><th>Device Type</th><td>${rmaRequest.asset?.deviceType || 'N/A'}</td></tr>
        <tr><th>Serial Number</th><td>${rmaRequest.oldSerialNumber || 'N/A'}</td></tr>
        <tr><th>Status</th><td>${rmaRequest.status}</td></tr>
        <tr><th>Requested By</th><td>${requestedBy?.fullName || requestedBy?.name || 'System'}</td></tr>
        <tr><th>Request Date</th><td>${new Date(rmaRequest.createdAt).toLocaleString()}</td></tr>
      </table>
      
      <p><strong>Issue Description:</strong></p>
      <div class="info-box">${rmaRequest.issueDescription || 'No description provided'}</div>
      
      <p><strong>Failure Symptoms:</strong></p>
      <div class="info-box">${rmaRequest.failureSymptoms || 'No symptoms listed'}</div>
      
      <p>Please review and process this RMA request at your earliest convenience.</p>
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/tickets/${ticket._id}" class="btn" style="color: white !important; text-decoration: none;">View Ticket &amp; RMA Details</a>
      </div>

      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = `New RMA Request: ${rmaRequest.rmaNumber}`;
    await sendViaBrevo({
      to: recipients,
      subject,
      html: emailTemplate(content, 'RMA Request Generated'),
    });

    console.log(`RMA creation email sent to ${recipients.length} recipients`);
    // Log individually for tracking
    for (const user of notifyUsers) {
      if (user.email) {
        await logNotification(user.email, subject, content, 'RMA', ticket._id, 'Sent', null, user._id);
      }
    }

  } catch (error) {
    console.error('Error sending RMA creation email:', error);
    await logNotification('Multiple Recipients', 'RMA Creation', 'Failed', 'RMA', ticket._id, 'Failed', error.message);

  }
};

/**
 * Send email when ticket status changes
 */
export const sendTicketStatusChangeEmail = async (ticket, user, oldStatus, newStatus, comments = '') => {
  try {

    const content = `
      <p>Hello <strong>${user.fullName || user.username}</strong>,</p>
      <p>The status of your ticket has been updated.</p>
      
      <table class="data-table">
        <tr><th>Ticket ID</th><td>${ticket.ticketNumber}</td></tr>
        <tr><th>Subject</th><td>${ticket.title}</td></tr>
        <tr><th>Previous Status</th><td>${oldStatus}</td></tr>
        <tr><th>New Status</th><td><strong>${newStatus}</strong></td></tr>
      </table>
      
      ${comments ? `<p><strong>Update Comments:</strong></p><div class="info-box">${comments}</div>` : ''}
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/tickets/${ticket._id}" class="btn" style="color: white !important; text-decoration: none;">View Ticket</a>
      </div>
      
      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = `Ticket Status Update: ${ticket.ticketNumber}`;
    await sendViaBrevo({
      to: user.email,
      subject,
      html: emailTemplate(content, 'Ticket Status Updated'),
    });

    console.log(`Ticket status change email sent to ${user.email}`);
    await logNotification(user.email, subject, content, 'TicketStatus', ticket._id, 'Sent', null, user._id);
  } catch (error) {
    console.error('Error sending ticket status change email:', error);
    await logNotification(user.email, 'Ticket Status Update', 'Failed', 'TicketStatus', ticket._id, 'Failed', error.message, user._id);
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, newPassword) => {
  try {

    const content = `
      <p>Hello <strong>${user.fullName || user.username}</strong>,</p>
      <p>Your password has been reset by an administrator.</p>
      
      <table class="data-table">
        <tr><th>Username</th><td>${user.username}</td></tr>
        <tr><th>New Temporary Password</th><td><code>${newPassword}</code></td></tr>
      </table>
      
      <p><strong style="color: #dc3545;">Important:</strong> Please change this password immediately after logging in for security purposes.</p>
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/login" class="btn" style="color: white !important; text-decoration: none;">Login to System</a>
      </div>
      
      <p>If you did not request this password reset, please contact your system administrator immediately.</p>
      
      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = 'Your Password Has Been Reset';
    await sendViaBrevo({
      to: user.email,
      subject,
      html: emailTemplate(content, 'Password Reset'),
    });

    console.log(`Password reset email sent to ${user.email}`);
    await logNotification(user.email, subject, content, 'PasswordReset', null, 'Sent', null, user._id);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    await logNotification(user.email, 'Password Reset', 'Failed', 'PasswordReset', null, 'Failed', error.message, user._id);
  }
};

/**
 * Send specific breach warning email
 */
export const sendBreachWarningEmail = async (ticket, user, minutesLeft) => {
  try {
    const timeLabel = minutesLeft != null
      ? (minutesLeft <= 60 ? `~${minutesLeft} minutes` : `~${Math.round(minutesLeft / 60)} hours`)
      : 'Less than 4 hours';
    const isUrgent = minutesLeft != null && minutesLeft <= 60;
    const accentColor = isUrgent ? '#dc3545' : '#e67e22';

    const content = `
      <p>Hello <strong>${user.fullName || user.username}</strong>,</p>
      <p>This is a${isUrgent ? ' <strong style="color:${accentColor}">FINAL</strong>' : ''} warning that a ticket is approaching its SLA Resolution Deadline.</p>

      <table class="data-table">
        <tr><th>Ticket ID</th><td>${ticket.ticketNumber}</td></tr>
        <tr><th>Subject</th><td>${ticket.title}</td></tr>
        <tr><th>Priority</th><td>${priorityBadge(ticket.priority)}</td></tr>
        <tr><th>Expected Resolution</th><td><strong>${ticket.slaRestoreDue ? new Date(ticket.slaRestoreDue).toLocaleString() : 'N/A'}</strong></td></tr>
        <tr><th>Time Remaining</th><td style="color:${accentColor};font-weight:700;">${timeLabel}</td></tr>
      </table>

      <p><strong style="color: ${accentColor};">${isUrgent ? 'FINAL WARNING: Immediate action required!' : 'Please prioritize this ticket to avoid a potential SLA breach.'}</strong></p>

      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/tickets/${ticket._id}" class="btn" style="color: white !important; text-decoration: none; background-color: ${accentColor};">View Ticket Now</a>
      </div>

      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = isUrgent
      ? `FINAL SLA WARNING: Ticket ${ticket.ticketNumber} ${timeLabel} Remaining`
      : `SLA WARNING: Ticket ${ticket.ticketNumber} Approaching Breach`;
    await sendViaBrevo({
      to: user.email,
      subject,
      html: emailTemplate(content, 'SLA Breach Warning'),
    });

    console.log(`Breach warning email sent to ${user.email}`);
    await logNotification(user.email, subject, content, 'BreachWarning', ticket._id, 'Sent', null, user._id);
    return true;
  } catch (error) {
    console.error('Error sending breach warning email:', error);
    await logNotification(user.email, 'Breach Warning', 'Failed', 'BreachWarning', ticket._id, 'Failed', error.message, user._id);
    return false;
  }
};

/**
 * Send actual SLA breach notification to User AND Admins
 */
export const sendSlaBreachedEmail = async (ticket, user, admins) => {
  try {

    // 1. Send to Assigned User
    if (user) {
      const userContent = `
        <p>Hello <strong>${user.fullName || user.username}</strong>,</p>
        <p>The following ticket has <strong>BREACHED</strong> its SLA Resolution Deadline.</p>
        
        <table class="data-table">
          <tr><th>Ticket ID</th><td>${ticket.ticketNumber}</td></tr>
          <tr><th>Subject</th><td>${ticket.title}</td></tr>
          <tr><th>Exceeded Deadline</th><td><span style="color: #dc3545;">${ticket.slaRestoreDue ? new Date(ticket.slaRestoreDue).toLocaleString() : 'N/A'}</span></td></tr>
        </table>
        
        <p><strong style="color: #dc3545;">Immediate action is required.</strong></p>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/tickets/${ticket._id}" class="btn" style="color: white !important; text-decoration: none; background-color: #dc3545;">View Breached Ticket</a>
        </div>
        
        <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
      `;

      await sendViaBrevo({
        to: user.email,
        subject: `SLA BREACHED: Ticket ${ticket.ticketNumber}`,
        html: emailTemplate(userContent, 'SLA Breach Notification'),
      });
      await logNotification(user.email, `SLA BREACHED: Ticket ${ticket.ticketNumber}`, userContent, 'SLABreach', ticket._id, 'Sent', null, user._id);
    }

    // 2. Send to Admins
    const adminContent = `
      <p>Hello Admin,</p>
      <p>A ticket has <strong>BREACHED</strong> its SLA Resolution Deadline.</p>
      
      <table class="data-table">
        <tr><th>Ticket ID</th><td>${ticket.ticketNumber}</td></tr>
        <tr><th>Assigned To</th><td>${user ? (user.fullName || user.username) : 'Unassigned'}</td></tr>
        <tr><th>Exceeded Deadline</th><td><span style="color: #dc3545;">${ticket.slaRestoreDue ? new Date(ticket.slaRestoreDue).toLocaleString() : 'N/A'}</span></td></tr>
      </table>
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/tickets/${ticket._id}" class="btn" style="color: white !important; text-decoration: none; background-color: #dc3545;">View Breached Ticket</a>
      </div>
      
      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const adminEmails = admins.map(a => a.email).filter(Boolean);
    if (adminEmails.length > 0) {
      await sendViaBrevo({
        to: adminEmails,
        subject: `ADMIN ALERT: SLA Breach for ${ticket.ticketNumber}`,
        html: emailTemplate(adminContent, 'SLA Breach Alert'),
      });

      // Log for each admin
      for (const admin of admins) {
        if (admin.email) {
          await logNotification(admin.email, `ADMIN ALERT: SLA Breach for ${ticket.ticketNumber}`, adminContent, 'SLABreach', ticket._id, 'Sent', null, admin._id);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending SLA breach email:', error);
    await logNotification('Admins/User', 'SLA Breach', 'Failed', 'SLABreach', ticket._id, 'Failed', error.message);
    return false;
  }
};

// Recurring "still overdue" reminder to the assignee - sent every 3h within working
// hours by the reminder cron, distinct copy from the one-time breach notification above.
export const sendSlaOverdueReminderEmail = async (ticket, user) => {
  try {
    if (!user?.email) return false;

    const content = `
      <p>Hello <strong>${user.fullName || user.username}</strong>,</p>
      <p>This ticket is still <strong>past its SLA Resolution Deadline</strong>. Please update it or request an extension if you need more time.</p>

      <table class="data-table">
        <tr><th>Ticket ID</th><td>${ticket.ticketNumber}</td></tr>
        <tr><th>Subject</th><td>${ticket.title}</td></tr>
        <tr><th>SLA Deadline</th><td><span style="color: #dc3545;">${ticket.slaRestoreDue ? new Date(ticket.slaRestoreDue).toLocaleString() : 'N/A'}</span></td></tr>
      </table>

      <p><strong style="color: #dc3545;">Immediate action is required.</strong></p>

      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/tickets/${ticket._id}" class="btn" style="color: white !important; text-decoration: none; background-color: #dc3545;">View Ticket</a>
      </div>

      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    await sendViaBrevo({
      to: user.email,
      subject: `Reminder: Ticket ${ticket.ticketNumber} is still SLA-overdue`,
      html: emailTemplate(content, 'SLA Overdue Reminder'),
    });
    await logNotification(user.email, `Reminder: Ticket ${ticket.ticketNumber} is still SLA-overdue`, content, 'Other', ticket._id, 'Sent', null, user._id);

    return true;
  } catch (error) {
    console.error('Error sending SLA overdue reminder email:', error);
    await logNotification(user?.email || 'Unknown', 'SLA Overdue Reminder', 'Failed', 'Other', ticket._id, 'Failed', error.message);
    return false;
  }
};

/**
 * Send RMA Milestone notifications (role-based targeting)
 * @param {Object} rma - RMA request object
 * @param {String} milestone - Milestone type: 'Dispatched', 'Received', 'Repaired', 'StockInTransit', 'StockReceived', 'RepairedItemEnRoute', 'RepairedItemReceived'
 * @param {Array} recipients - Users to notify
 * @param {Object} additionalDetails - Additional context (shippingDetails, etc.)
 */
export const sendRMAMilestoneEmail = async (rma, milestone, recipients, additionalDetails = {}) => {
  try {

    if (!recipients || recipients.length === 0) {
      console.log('No recipients for RMA milestone notification');
      return false;
    }

    const recipientEmails = recipients.map(u => u.email).filter(Boolean);
    if (recipientEmails.length === 0) return false;

    // Define milestone-specific content
    const milestoneConfig = {
      'Dispatched': {
        color: '#2563eb',
        title: 'Replacement Device Dispatched',
        message: 'A replacement device has been dispatched and is on its way to the site.'
      },
      'Received': {
        color: '#16a34a',
        title: 'Replacement Device Received',
        message: 'The replacement device has been received at the site.'
      },
      'Repaired': {
        color: '#7c3aed',
        title: 'Item Repaired Successfully',
        message: 'The faulty item has been repaired and is ready for deployment.'
      },
      'StockInTransit': {
        color: '#2563eb',
        title: 'HO Stock In Transit',
        message: 'Stock from Head Office is being shipped to the site for RMA replacement.'
      },
      'StockReceived': {
        color: '#16a34a',
        title: 'HO Stock Received & Installed',
        message: 'Stock from Head Office has been received and the hardware has been swapped.'
      },
      'RepairedItemEnRoute': {
        color: '#2563eb',
        title: 'Repaired Item En Route',
        message: 'The repaired item is being shipped back to the site for re-installation.'
      },
      'RepairedItemReceived': {
        color: '#16a34a',
        title: 'Repaired Item Received',
        message: 'The repaired item has been received and is ready for re-installation.'
      }
    };

    const config = milestoneConfig[milestone] || {
      color: '#64748b',
      title: `RMA Update: ${milestone}`,
      message: `The RMA status has been updated to: ${milestone}`
    };

    const content = `
      <p>Hello,</p>
      <p><span class="badge" style="background:${config.color};">${milestone}</span></p>
      <h3 style="margin: 10px 0 4px;">${config.title}</h3>
      <p>${config.message}</p>

      <table class="data-table">
        <tr><th>RMA Number</th><td>${rma.rmaNumber}</td></tr>
        <tr><th>Asset Code</th><td>${rma.originalAssetId?.assetCode || 'N/A'}</td></tr>
        <tr><th>Asset Type</th><td>${rma.originalAssetId?.assetType || 'N/A'}</td></tr>
        <tr><th>Device Type</th><td>${rma.originalAssetId?.deviceType || 'N/A'}</td></tr>
        <tr><th>Replacement Source</th><td>${rma.replacementSource || 'N/A'}</td></tr>
        ${additionalDetails.siteName ? `<tr><th>Site</th><td>${additionalDetails.siteName}</td></tr>` : ''}
        ${additionalDetails.shippingDetails?.trackingNumber ? `<tr><th>Tracking Number</th><td>${additionalDetails.shippingDetails.trackingNumber}</td></tr>` : ''}
        ${additionalDetails.shippingDetails?.carrier ? `<tr><th>Carrier</th><td>${additionalDetails.shippingDetails.carrier}</td></tr>` : ''}
        <tr><th>Status</th><td><strong>${milestone}</strong></td></tr>
        <tr><th>Updated On</th><td>${new Date().toLocaleString()}</td></tr>
      </table>
      
      ${additionalDetails.remarks ? `<p><strong>Remarks:</strong></p><div class="info-box">${additionalDetails.remarks}</div>` : ''}
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/tickets/${rma.ticketId}" class="btn" style="color: white !important; text-decoration: none;">View Ticket &amp; RMA Details</a>
      </div>

      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = `RMA ${milestone}: ${rma.rmaNumber}`;
    await sendViaBrevo({
      to: recipientEmails,
      subject,
      html: emailTemplate(content, config.title),
    });

    console.log(`RMA milestone (${milestone}) email sent to ${recipientEmails.length} recipients`);

    // Log for each recipient
    for (const user of recipients) {
      if (user.email) {
        await logNotification(user.email, subject, content, 'RMA', rma.ticketId, 'Sent', null, user._id);
      }
    }

    return true;
  } catch (error) {
    console.error(`Error sending RMA milestone (${milestone}) email:`, error);
    await logNotification('Multiple Recipients', `RMA ${milestone}`, 'Failed', 'RMA', rma.ticketId, 'Failed', error.message);
    return false;
  }
};

/**
 * Send general broadcast email to all users or specific user
 */
export const sendGeneralNotificationEmail = async (recipients, notification) => {
  try {

    // Convert single recipient to array
    const recipientList = Array.isArray(recipients) ? recipients : [recipients];
    const recipientEmails = recipientList.map(u => u.email).filter(Boolean);

    if (recipientEmails.length === 0) {
      console.log('No recipient emails found for general notification');
      return false;
    }

    // Strip base64 inline images email clients block them; replace with a clickable notice
    const appUrl = process.env.FRONTEND_URL || 'https://ticketops.vluccc.com';
    const emailSafeMessage = (notification.message || '').replace(
      /<img[^>]+src="data:[^"]*"[^>]*\/?>/gi,
      `<em style="color:#888;font-size:0.9em;">[Screenshot included <a href="${appUrl}/notifications" style="color:#667eea;">view in TicketOps</a>]</em>`
    );

    const content = `
      <p>Hello,</p>
      <p>A new ${notification.type || 'notification'} has been posted on TicketOps.</p>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #667eea;">${notification.title}</h3>
        <div style="margin-top: 8px;">${emailSafeMessage}</div>
      </div>

      ${notification.link ? `
      <div style="text-align: center;">
        <a href="${notification.link.startsWith('http') ? notification.link : appUrl + notification.link}" class="btn" style="color: white !important; text-decoration: none;">View on System</a>
      </div>
      ` : ''}

      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = `Notification: ${notification.title}`;

    if (recipientEmails.length > 50) {
      await sendViaBrevo({
        bcc: recipientEmails,
        subject,
        html: emailTemplate(content, 'New Notification'),
      });
    } else {
      await sendViaBrevo({
        to: recipientEmails,
        subject,
        html: emailTemplate(content, 'New Notification'),
      });
    }

    console.log(`General notification email sent to ${recipientEmails.length} recipients`);

    // Log for each recipient
    for (const user of recipientList) {
      if (user.email) {
        await logNotification(user.email, subject, content, 'General', null, 'Sent', null, user._id);
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending general notification email:', error);
    return false;
  }
};

// Default export declared after all function definitions to avoid ES module TDZ errors.
// Named exports are on each function via 'export const'.

/**
 * Notify all admins that a new client sign-up is pending review
 */
export const sendClientSignupAlertEmail = async (registration, adminEmails) => {
  try {
    if (!adminEmails || adminEmails.length === 0) return;

    const content = `
      <p>Hello Admin,</p>
      <p>A new client has submitted a registration request and is awaiting your review.</p>

      <table class="data-table">
        <tr><th>Name</th><td>${registration.fullName}</td></tr>
        <tr><th>Email</th><td>${registration.email}</td></tr>
        <tr><th>Phone</th><td>${registration.phone}</td></tr>
        <tr><th>Designation</th><td>${registration.designation}</td></tr>
        <tr><th>Site Name</th><td>${registration.siteName}</td></tr>
        ${registration.message ? `<tr><th>Message</th><td>${registration.message}</td></tr>` : ''}
        <tr><th>Submitted On</th><td>${new Date(registration.createdAt).toLocaleString()}</td></tr>
      </table>

      <p>Please log in to review and approve or reject this request.</p>

      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/admin/client-registrations" class="btn" style="color: white !important; text-decoration: none;">Review Request</a>
      </div>

      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = `New Client Sign-Up Request: ${registration.fullName} (${registration.siteName})`;
    await sendViaBrevo({
      to: adminEmails,
      subject,
      html: emailTemplate(content, 'New Client Registration'),
    });

    console.log(`Client signup alert sent to ${adminEmails.length} admin(s)`);
    await logNotification(adminEmails.join(', '), subject, content, 'Account', null, 'Sent');
  } catch (error) {
    console.error('Error sending client signup alert email:', error);
  }
};

/**
 * Send approval email to client with their login credentials
 */
export const sendClientApprovalEmail = async (registration, username, tempPassword) => {
  try {

    const content = `
      <p>Hello <strong>${registration.fullName}</strong>,</p>
      <p>Great news! Your client registration request has been <strong style="color: #10b981;">approved</strong>.</p>
      <p>Your TicketOps account has been created. Please use the credentials below to log in.</p>

      <table class="data-table">
        <tr><th>Username</th><td><code>${username}</code></td></tr>
        <tr><th>Temporary Password</th><td><code>${tempPassword}</code></td></tr>
        <tr><th>Site</th><td>${registration.siteName}</td></tr>
      </table>

      <div class="info-box">
        <strong>Important:</strong> This is a temporary password. Please change it after your first login for security purposes.
      </div>

      <p>Once logged in, you can raise support tickets for your site and track their progress in real time.</p>

      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/login" class="btn" style="color: white !important; text-decoration: none;">Login Now</a>
      </div>

      <p>If you have any questions, please contact your system administrator.</p>
      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = 'Your TicketOps Client Account is Ready';
    await sendViaBrevo({
      to: registration.email,
      subject,
      html: emailTemplate(content, 'Account Approved'),
    });

    console.log(`Client approval email sent to ${registration.email}`);
    await logNotification(registration.email, subject, content, 'Account', null, 'Sent', null, registration.userId);
  } catch (error) {
    console.error('Error sending client approval email:', error);
  }
};

/**
 * Send rejection email to client with the reason provided by admin
 */
export const sendClientRejectionEmail = async (registration) => {
  try {

    const content = `
      <p>Hello <strong>${registration.fullName}</strong>,</p>
      <p>Thank you for your interest in TicketOps. Unfortunately, we were unable to approve your registration request at this time.</p>

      ${registration.rejectionReason ? `
      <p><strong>Reason:</strong></p>
      <div class="info-box" style="border-left-color: #ef4444;">${registration.rejectionReason}</div>
      ` : ''}

      <p>If you believe this is an error or need further clarification, please contact your administrator.</p>
      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

    const subject = 'TicketOps Registration Request Update';
    await sendViaBrevo({
      to: registration.email,
      subject,
      html: emailTemplate(content, 'Registration Update'),
    });

    console.log(`Client rejection email sent to ${registration.email}`);
    await logNotification(registration.email, subject, content, 'Account', null, 'Sent');
  } catch (error) {
    console.error('Error sending client rejection email:', error);
  }
};

export const sendActivityAssignmentEmail = async (activity, project, users) => {
  if (!users?.length) return;
  const validUsers = users.filter(u => u?.email);
  if (!validUsers.length) return;

  const taskList = (activity.tasks || []).slice(0, 10)
    .map(t => `  - ${t.title}${t.plannedEnd ? ` (due ${new Date(t.plannedEnd).toLocaleDateString()})` : ''}`)
    .join('\n');

  for (const user of validUsers) {
    try {
      await sendViaBrevo({
        to: user.email,
        subject: `Activity Assigned: ${activity.title} ${project.projectName}`,
        html: emailTemplate(`
          <h2 style="margin:0 0 1rem">You have been assigned to an activity</h2>
          <table style="width:100%;border-collapse:collapse;font-size:0.95rem">
            <tr><td style="padding:0.4rem 0.6rem;font-weight:600;width:130px">Activity</td><td style="padding:0.4rem 0.6rem">${activity.activityNumber} ${activity.title}</td></tr>
            <tr style="background:rgba(0,0,0,0.03)"><td style="padding:0.4rem 0.6rem;font-weight:600">Project</td><td style="padding:0.4rem 0.6rem">${project.projectName} (${project.projectNumber})</td></tr>
            <tr><td style="padding:0.4rem 0.6rem;font-weight:600">Type</td><td style="padding:0.4rem 0.6rem">${activity.type}</td></tr>
            <tr style="background:rgba(0,0,0,0.03)"><td style="padding:0.4rem 0.6rem;font-weight:600">Priority</td><td style="padding:0.4rem 0.6rem">${activity.priority}</td></tr>
            <tr><td style="padding:0.4rem 0.6rem;font-weight:600">Planned</td><td style="padding:0.4rem 0.6rem">${activity.plannedStart ? new Date(activity.plannedStart).toLocaleDateString() : 'TBD'} → ${activity.plannedEnd ? new Date(activity.plannedEnd).toLocaleDateString() : 'TBD'}</td></tr>
          </table>
          ${taskList ? `<h3 style="margin:1.2rem 0 0.5rem">Tasks</h3><pre style="background:#f4f7fa;padding:0.75rem;border-radius:6px;font-size:0.85rem">${taskList}</pre>` : ''}
          <p style="margin-top:1.2rem">Log in to TicketOps to view the full activity details and track progress.</p>
        `, `Activity Assigned: ${activity.title}`),
      });
    } catch (err) {
      console.error('Activity assignment email failed for', user.email, err.message);
    }
  }
};

// Combined default export placed after all declarations.
export default {
  sendAccountCreationEmail,
  sendTicketAssignmentEmail,
  sendTicketEscalationEmail,
  sendRMACreationEmail,
  sendTicketStatusChangeEmail,
  sendPasswordResetEmail,
  sendBreachWarningEmail,
  sendSlaBreachedEmail,
  sendRMAMilestoneEmail,
  sendGeneralNotificationEmail,
  sendClientSignupAlertEmail,
  sendClientApprovalEmail,
  sendClientRejectionEmail,
  sendDeviceAssignmentEmail
};
