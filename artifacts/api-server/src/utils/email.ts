import nodemailer from 'nodemailer';

// ✅ Gmail Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // App password with spaces
  },
});

// Test connection (async/await version)
(async () => {
  try {
    await transporter.verify();
    console.log('✅ Gmail SMTP connected successfully');
  } catch (error) {
    console.error('⚠️  Gmail connection warning:', error instanceof Error ? error.message : error);
  }
})();

export async function sendStaffInviteEmail(
  email: string,
  name: string,
  inviteLink: string,
  adminName: string
): Promise<boolean> {
  try {
    const subject = 'You\'re Invited to Join Intikhab-e-Zauj Staff';
    
    const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
      .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin: 20px 0; }
      .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; cursor: pointer; }
      .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to Intikhab-e-Zauj Staff Portal</h1>
      </div>
      
      <div class="content">
        <p>Hello <strong>${name}</strong>,</p>
        
        <p><strong>${adminName}</strong> has invited you to join the Intikhab-e-Zauj staff team as a moderator.</p>
        
        <p>Click the button below to set your password and activate your account:</p>
        
        <center>
          <a href="${inviteLink}" class="button">Activate Account</a>
        </center>
        
        <p>Or copy this link if the button doesn't work:</p>
        <code style="background: #eee; padding: 10px; display: block; word-break: break-all; font-size: 12px;">
          ${inviteLink}
        </code>
        
        <div class="warning">
          <strong>⏰ Important:</strong> This invite link expires in 7 days. If it expires, the admin can resend a new invite.
        </div>
        
        <p>Once you set your password, you'll be able to:</p>
        <ul>
          <li>Review and approve member profiles</li>
          <li>Manage matches and proposals</li>
          <li>Moderate Q&A and messaging</li>
          <li>Access audit logs</li>
        </ul>
      </div>
      
      <div class="footer">
        <p>© 2026 Intikhab-e-Zauj. All rights reserved.</p>
        <p>This is an automated email. Please do not reply.</p>
      </div>
    </div>
  </body>
</html>
    `;

    const plainTextBody = `
Welcome to Intikhab-e-Zauj Staff Portal

Hello ${name},

${adminName} has invited you to join the Intikhab-e-Zauj staff team as a moderator.

Click the link below to set your password and activate your account:
${inviteLink}

This invite link expires in 7 days. If it expires, the admin can resend a new invite.

Once you set your password, you'll be able to:
- Review and approve member profiles
- Manage matches and proposals
- Moderate Q&A and messaging
- Access audit logs

© 2026 Intikhab-e-Zauj. All rights reserved.
    `;

    console.log(`📧 Sending invite email to ${email}...`);

    const result = await transporter.sendMail({
      from: `"Intikhab-e-Zauj" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text: plainTextBody,
      html: htmlBody,
      replyTo: process.env.EMAIL_USER,
    });

    console.log(`✅ Email sent successfully!`);
    console.log(`   To: ${email}`);
    console.log(`   Message ID: ${result.messageId}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error instanceof Error ? error.message : error);
    return false;
  }
}
