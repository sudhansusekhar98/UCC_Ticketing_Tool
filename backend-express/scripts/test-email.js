import 'dotenv/config';

/**
 * Quick test script to verify Brevo email configuration
 * Run with: node scripts/test-email.js
 */

async function testEmailConfig() {
    console.log('\n🔧 Testing Brevo Email Configuration...\n');

    console.log('Current Settings:');
    console.log(`  API Key: ${process.env.BREVO_API_KEY ? '***' + process.env.BREVO_API_KEY.slice(-8) : 'NOT SET'}`);
    console.log(`  Sender Email: ${process.env.BREVO_SENDER_EMAIL}`);
    console.log(`  Frontend URL: ${process.env.FRONTEND_URL}\n`);

    if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
        console.error('❌ Missing BREVO_API_KEY or BREVO_SENDER_EMAIL in .env');
        process.exit(1);
    }

    try {
        console.log('Sending test email via Brevo API...');

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
            },
            body: JSON.stringify({
                sender: {
                    name: 'TicketOps',
                    email: process.env.BREVO_SENDER_EMAIL,
                },
                to: [{ email: process.env.BREVO_SENDER_EMAIL }],
                subject: 'Test Email - TicketOps (Brevo)',
                htmlContent: `
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
                          <p class="success">✓ Your Brevo configuration is working correctly!</p>
                          <p>This is a test email from TicketOps.</p>
                          <p><strong>Configuration Details:</strong></p>
                          <ul>
                            <li>Provider: Brevo (API)</li>
                            <li>Sender: ${process.env.BREVO_SENDER_EMAIL}</li>
                            <li>Test Date: ${new Date().toLocaleString()}</li>
                          </ul>
                          <p>All email notifications are now ready to be sent!</p>
                        </div>
                      </div>
                    </body>
                    </html>
                `,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Brevo API error ${response.status}: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        console.log('✓ Test email sent successfully!');
        console.log(`  Message ID: ${result.messageId}\n`);
        console.log('✅ All email configuration tests passed!\n');
        console.log('Your email notification system is ready to use.\n');

    } catch (error) {
        console.error('\n❌ Email configuration test failed!\n');
        console.error('Error:', error.message);
        console.error('\nPlease check your Brevo settings in the .env file.\n');

        if (error.message.includes('401')) {
            console.error('💡 Authentication failed. Please verify your BREVO_API_KEY is correct.\n');
        } else if (error.message.includes('400')) {
            console.error('💡 Bad request. Please verify your BREVO_SENDER_EMAIL is verified in Brevo.\n');
        }

        process.exit(1);
    }
}

testEmailConfig();
