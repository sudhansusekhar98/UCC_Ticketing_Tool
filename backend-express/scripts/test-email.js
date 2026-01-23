import 'dotenv/config';
import { createTransport } from 'nodemailer';

/**
 * Quick test script to verify SMTP email configuration
 * Run with: node scripts/test-email.js
 */

async function testEmailConfig() {
    console.log('\n🔧 Testing Email Configuration...\n');

    // Display current configuration
    console.log('Current SMTP Settings:');
    console.log(`  Host: ${process.env.SMTP_HOST}`);
    console.log(`  Port: ${process.env.SMTP_PORT}`);
    console.log(`  User: ${process.env.SMTP_USER}`);
    console.log(`  Frontend URL: ${process.env.FRONTEND_URL}\n`);

    try {
        // Create transporter
        const transporter = createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        console.log('✓ Email transporter created successfully\n');

        // Verify connection
        console.log('Verifying SMTP connection...');
        await transporter.verify();
        console.log('✓ SMTP connection verified successfully!\n');

        // Send test email
        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: `"UCC Ticketing System" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Send to self for testing
            subject: 'Test Email - UCC Ticketing System',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px; background: #f4f4f4; margin-top: 20px; border-radius: 5px; }
            .success { color: #28a745; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🎉 Email Test Successful!</h2>
            </div>
            <div class="content">
              <p class="success">✓ Your SMTP configuration is working correctly!</p>
              <p>This is a test email from the UCC Ticketing System.</p>
              <p><strong>Configuration Details:</strong></p>
              <ul>
                <li>SMTP Host: ${process.env.SMTP_HOST}</li>
                <li>SMTP Port: ${process.env.SMTP_PORT}</li>
                <li>From: ${process.env.SMTP_USER}</li>
                <li>Test Date: ${new Date().toLocaleString()}</li>
              </ul>
              <p>All email notifications are now ready to be sent!</p>
            </div>
          </div>
        </body>
        </html>
      `,
        });

        console.log('✓ Test email sent successfully!');
        console.log(`  Message ID: ${info.messageId}\n`);

        console.log('✅ All email configuration tests passed!\n');
        console.log('Your email notification system is ready to use.\n');

    } catch (error) {
        console.error('\n❌ Email configuration test failed!\n');
        console.error('Error:', error.message);
        console.error('\nPlease check your SMTP settings in the .env file.\n');

        if (error.code === 'EAUTH') {
            console.error('💡 Authentication failed. Please verify:');
            console.error('   - SMTP username is correct');
            console.error('   - SMTP password is correct');
            console.error('   - If using Gmail, ensure you are using an App Password\n');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            console.error('💡 Connection failed. Please verify:');
            console.error('   - SMTP host is correct');
            console.error('   - SMTP port is correct');
            console.error('   - Your network allows outbound SMTP connections\n');
        }

        process.exit(1);
    }
}

// Run the test
testEmailConfig();
