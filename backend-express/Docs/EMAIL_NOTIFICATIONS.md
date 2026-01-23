# Email Notification System

## Overview
The TicketOps now includes comprehensive email notifications to keep users informed about important events and actions within the system.

## SMTP Configuration

Email notifications are configured through environment variables in the `.env` file:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=support@vlaccess.com
SMTP_PASS=komqumdelemayjiy
FRONTEND_URL=http://localhost:5173
```

**Important:** For production, update the `FRONTEND_URL` to your actual frontend domain.

## Notification Types

### 1. **Account Creation**
- **Trigger:** When a new user account is created by an admin
- **Recipients:** The newly created user
- **Email Contains:**
  - Username
  - Email address
  - Temporary password
  - Role
  - Login link

**Code Location:** `backend-express/controllers/user.controller.js` - `createUser` function

### 2. **Password Reset**
- **Trigger:** When an admin resets a user's password
- **Recipients:** The user whose password was reset
- **Email Contains:**
  - Username
  - New temporary password
  - Login link
  - Security warning

**Code Location:** `backend-express/controllers/user.controller.js` - `resetPassword` function

### 3. **Ticket Assignment**
- **Trigger:** When a ticket is assigned to an engineer
- **Recipients:** The assigned user
- **Email Contains:**
  - Ticket ID
  - Subject
  - Priority
  - Status
  - Site
  - Due date
  - Description
  - Link to view ticket

**Code Location:** `backend-express/controllers/ticket.controller.js` - `assignTicket` function

### 4. **Ticket Escalation**
- **Trigger:** When a ticket is escalated to a higher level
- **Recipients:** All users with escalation rights for that specific level
- **Email Contains:**
  - Ticket ID
  - Subject
  - Priority
  - Escalation level
  - Escalation reason
  - Escalated by user
  - Link to view ticket

**Code Location:** `backend-express/controllers/ticket.controller.js` - `escalateTicket` function

**Note:** The system automatically identifies users with `ESCALATION_L1`, `ESCALATION_L2`, or `ESCALATION_L3` rights and sends notifications to the appropriate users based on the escalation level.

### 5. **RMA Request Generation**
- **Trigger:** When a new RMA (Return Merchandise Authorization) request is created
- **Recipients:** All active Admins and Supervisors
- **Email Contains:**
  - RMA number
  - Related ticket number
  - Asset details
  - Serial number
  - Issue description
  - Request date
  - Link to RMA details

**Code Location:** `backend-express/controllers/rma.controller.js` - `createRMA` function

## Email Template Design

All emails use a consistent, professional template with:
- Modern, gradient header (purple theme)
- Responsive design
- Clear information boxes
- Call-to-action buttons
- Branded footer
- Mobile-friendly layout

The template is defined in `backend-express/utils/email.utils.js` in the `emailTemplate` function.

## Adding Additional Notification Types

To add new notification types, follow this pattern:

1. **Create Email Function** in `backend-express/utils/email.utils.js`:

```javascript
export const sendYourNotificationEmail = async (data, recipient) => {
  try {
    const transporter = createTransporter();
    
    const content = `
      <p>Hello <strong>${recipient.name}</strong>,</p>
      <p>Your notification message here...</p>
      
      <div class="info-box">
        <p><strong>Field 1:</strong> ${data.field1}</p>
        <p><strong>Field 2:</strong> ${data.field2}</p>
      </div>
      
      <a href="${process.env.FRONTEND_URL}/your-link" class="btn">View Details</a>
    `;

    await transporter.sendMail({
      from: `"TicketOps" <${process.env.SMTP_USER}>`,
      to: recipient.email,
      subject: 'Your Email Subject',
      html: emailTemplate(content, 'Email Title'),
    });

    console.log(`Email sent to ${recipient.email}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
```

2. **Import and Use** in your controller:

```javascript
import { sendYourNotificationEmail } from '../utils/email.utils.js';

// In your controller function
await sendYourNotificationEmail(dataObject, userObject);
```

## Error Handling

Email sending is implemented as a non-blocking operation. If an email fails to send:
- The error is logged to the console
- The main operation (user creation, ticket assignment, etc.) continues successfully
- Users are still notified via the system's UI notifications

This ensures that email failures don't break critical system functionality.

## Testing Email Notifications

For development/testing:

1. **Use a test SMTP service** like Mailtrap, Ethereal Email, or Gmail
2. **Update .env** with test credentials:
   ```bash
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your_test_user
   SMTP_PASS=your_test_password
   ```
3. **Test each notification type** by triggering the corresponding action in the UI

## Production Deployment

Before deploying to production:

1. ✅ **Update SMTP credentials** with production email server details
2. ✅ **Set FRONTEND_URL** to your production domain
3. ✅ **Verify email deliverability** (check spam folders, whitelist sender)
4. ✅ **Test all notification types** in production environment
5. ✅ **Monitor email logs** for any delivery issues

## Gmail SMTP Configuration

If using Gmail SMTP:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: Google Account → Security → App passwords
3. Use the App Password in `SMTP_PASS` environment variable

**App Passwords Location:** https://myaccount.google.com/apppasswords

## Troubleshooting

### Emails not being sent
- Check SMTP credentials in `.env`
- Verify SMTP server port (587 for TLS, 465 for SSL)
- Check server console logs for error messages
- Ensure recipient email addresses are valid

### Emails going to spam
- Configure SPF, DKIM, and DMARC records for your domain
- Use a reputable SMTP service
- Avoid spam trigger words in email content

### Template not rendering correctly
- Ensure HTML email support in recipient's email client
- Test with multiple email clients
- Use email testing tools (Litmus, Email on Acid)

## Future Enhancements

Possible additions to the notification system:
- Ticket status change notifications
- SLA breach warnings
- Daily/weekly digest emails
- Configurable notification preferences per user
- SMS notifications for critical alerts
- Notification templates customization via admin panel

---

**Last Updated:** January 2026
**Maintained By:** VL Access Development Team
