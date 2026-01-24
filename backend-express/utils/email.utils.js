import { createTransport } from 'nodemailer';
import 'dotenv/config';

// Create reusable transporter
const createTransporter = () => {
    return createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 24px;
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
      background-color: #667eea;
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
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 15px 0;
    }
    .info-box strong {
      color: #667eea;
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

/**
 * Send welcome email when a new account is created
 */
export const sendAccountCreationEmail = async (user, tempPassword) => {
    try {
        const transporter = createTransporter();

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

        await transporter.sendMail({
            from: `"TicketOps" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Welcome to TicketOps - Account Created',
            html: emailTemplate(content, 'Account Created'),
        });

        console.log(`Account creation email sent to ${user.email}`);
    } catch (error) {
        console.error('Error sending account creation email:', error);
        // Don't throw error - email failure shouldn't break the main flow
    }
};

/**
 * Send email when a ticket is assigned to an engineer
 */
export const sendTicketAssignmentEmail = async (ticket, assignedUser, assignedBy) => {
    try {
        const transporter = createTransporter();

        const content = `
      <p>Hello <strong>${assignedUser.fullName || assignedUser.username}</strong>,</p>
      <p>A new ticket has been assigned to you.</p>
      
      <table class="data-table">
        <tr><th>Ticket ID</th><td>${ticket.ticketNumber}</td></tr>
        <tr><th>Subject</th><td>${ticket.title}</td></tr>
        <tr><th>Priority</th><td>${ticket.priority}</td></tr>
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

        await transporter.sendMail({
            from: `"TicketOps" <${process.env.SMTP_USER}>`,
            to: assignedUser.email,
            subject: `Ticket Assigned: ${ticket.ticketNumber} - ${ticket.title}`,
            html: emailTemplate(content, 'Ticket Assigned'),
        });

        console.log(`Ticket assignment email sent to ${assignedUser.email}`);
    } catch (error) {
        console.error('Error sending ticket assignment email:', error);
    }
};

/**
 * Send email when a ticket is escalated
 */
export const sendTicketEscalationEmail = async (ticket, escalatedToUser, escalatedBy, escalationReason) => {
    try {
        const transporter = createTransporter();

        const content = `
      <p>Hello <strong>${escalatedToUser.fullName || escalatedToUser.username}</strong>,</p>
      <p>A ticket has been escalated to you and requires your immediate attention.</p>
      
      <table class="data-table">
        <tr><th>Ticket ID</th><td>${ticket.ticketNumber}</td></tr>
        <tr><th>Subject</th><td>${ticket.title}</td></tr>
        <tr><th>Priority</th><td>${ticket.priority}</td></tr>
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

        await transporter.sendMail({
            from: `"TicketOps" <${process.env.SMTP_USER}>`,
            to: escalatedToUser.email,
            subject: `🚨 ESCALATED: ${ticket.ticketNumber} - ${ticket.title}`,
            html: emailTemplate(content, 'Ticket Escalated'),
        });

        console.log(`Ticket escalation email sent to ${escalatedToUser.email}`);
    } catch (error) {
        console.error('Error sending ticket escalation email:', error);
    }
};

/**
 * Send email when an RMA request is created
 */
export const sendRMACreationEmail = async (rmaRequest, ticket, requestedBy, notifyUsers = []) => {
    try {
        const transporter = createTransporter();

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
        <tr><th>Asset</th><td>${rmaRequest.asset?.name || 'N/A'}</td></tr>
        <tr><th>Asset Type</th><td>${rmaRequest.asset?.assetType || 'N/A'}</td></tr>
        <tr><th>Serial Number</th><td>${rmaRequest.oldSerialNumber || 'N/A'}</td></tr>
        <tr><th>Status</th><td>${rmaRequest.status}</td></tr>
        <tr><th>Requested By</th><td>${requestedBy?.name || 'System'}</td></tr>
        <tr><th>Request Date</th><td>${new Date(rmaRequest.createdAt).toLocaleString()}</td></tr>
      </table>
      
      <p><strong>Issue Description:</strong></p>
      <div class="info-box">${rmaRequest.issueDescription || 'No description provided'}</div>
      
      <p><strong>Failure Symptoms:</strong></p>
      <div class="info-box">${rmaRequest.failureSymptoms || 'No symptoms listed'}</div>
      
      <p>Please review and process this RMA request at your earliest convenience.</p>
      
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://ticketops.vluccc.com'}/rma" class="btn" style="color: white !important; text-decoration: none;">View RMA Details</a>
      </div>
      
      <p>Best regards,<br/><strong>TicketOps VLAccess Team</strong></p>
    `;

        await transporter.sendMail({
            from: `"TicketOps" <${process.env.SMTP_USER}>`,
            to: recipients.join(', '),
            subject: `New RMA Request: ${rmaRequest.rmaNumber}`,
            html: emailTemplate(content, 'RMA Request Generated'),
        });

        console.log(`RMA creation email sent to ${recipients.length} recipients`);
    } catch (error) {
        console.error('Error sending RMA creation email:', error);
    }
};

/**
 * Send email when ticket status changes
 */
export const sendTicketStatusChangeEmail = async (ticket, user, oldStatus, newStatus, comments = '') => {
    try {
        const transporter = createTransporter();

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

        await transporter.sendMail({
            from: `"TicketOps" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: `Ticket Status Update: ${ticket.ticketNumber}`,
            html: emailTemplate(content, 'Ticket Status Updated'),
        });

        console.log(`Ticket status change email sent to ${user.email}`);
    } catch (error) {
        console.error('Error sending ticket status change email:', error);
    }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, newPassword) => {
    try {
        const transporter = createTransporter();

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

        await transporter.sendMail({
            from: `"TicketOps" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Your Password Has Been Reset',
            html: emailTemplate(content, 'Password Reset'),
        });

        console.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
        console.error('Error sending password reset email:', error);
    }
};

export default {
    sendAccountCreationEmail,
    sendTicketAssignmentEmail,
    sendTicketEscalationEmail,
    sendRMACreationEmail,
    sendTicketStatusChangeEmail,
    sendPasswordResetEmail,
};
