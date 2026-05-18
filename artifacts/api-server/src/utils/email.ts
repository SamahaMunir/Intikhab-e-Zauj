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

/**
 * Send profile approval email
 */
export async function sendProfileApprovalEmail(
  email: string,
  name: string
): Promise<boolean> {
  try {
    const subject = '🎉 Your Profile Has Been Approved!';
    
    const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px; }
      .content { padding: 20px; background: #f0fdf4; border-radius: 8px; margin: 20px 0; }
      .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; cursor: pointer; }
      .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Profile Approved! 🎉</h1>
      </div>
      
      <div class="content">
        <div class="success-icon">✅</div>
        
        <p>Hello <strong>${name}</strong>,</p>
        
        <p>Great news! Your profile has been approved by the Intikhab-e-Zauj team.</p>
        
        <p>You can now:</p>
        <ul>
          <li>View and manage your profile</li>
          <li>Browse potential matches</li>
          <li>Send and receive proposals</li>
          <li>Message other members</li>
        </ul>
        
        <p>Click the button below to access your dashboard:</p>
        
        <center>
          <a href="https://nikah-network.pk/dashboard" class="button">Go to Dashboard</a>
        </center>
        
        <p>If you have any questions, feel free to contact our support team.</p>
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
Profile Approved! 🎉

Hello ${name},

Great news! Your profile has been approved by the Intikhab-e-Zauj team.

You can now:
- View and manage your profile
- Browse potential matches
- Send and receive proposals
- Message other members

Access your dashboard: https://nikah-network.pk/dashboard

If you have any questions, feel free to contact our support team.

© 2026 Intikhab-e-Zauj. All rights reserved.
    `;

    console.log(`📧 Sending approval email to ${email}...`);

    const result = await transporter.sendMail({
      from: `"Intikhab-e-Zauj" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text: plainTextBody,
      html: htmlBody,
      replyTo: process.env.EMAIL_USER,
    });

    console.log(`✅ Approval email sent!`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send approval email:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Send profile rejection email
 */
export async function sendProfileRejectionEmail(
  email: string,
  name: string,
  reason: string
): Promise<boolean> {
  try {
    const subject = 'Profile Review Feedback - Please Reapply';
    
    const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px; }
      .content { padding: 20px; background: #fffbf0; border-radius: 8px; margin: 20px 0; }
      .reason-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 4px; }
      .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; cursor: pointer; }
      .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Profile Review Feedback</h1>
      </div>
      
      <div class="content">
        <p>Hello <strong>${name}</strong>,</p>
        
        <p>Thank you for submitting your profile to Intikhab-e-Zauj. We appreciate your interest!</p>
        
        <p>Unfortunately, your profile was not approved at this time. Here's the feedback:</p>
        
        <div class="reason-box">
          <strong>Reason:</strong><br/>
          ${reason}
        </div>
        
        <p><strong>What you can do:</strong></p>
        <ul>
          <li>Review the feedback carefully</li>
          <li>Update your profile with more information</li>
          <li>Resubmit for approval</li>
        </ul>
        
        <p>We're here to help! Feel free to reach out to our support team if you have any questions.</p>
        
        <center>
          <a href="https://nikah-network.pk/reapply" class="button">Reapply Now</a>
        </center>
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
Profile Review Feedback

Hello ${name},

Thank you for submitting your profile to Intikhab-e-Zauj. We appreciate your interest!

Unfortunately, your profile was not approved at this time. Here's the feedback:

Reason: ${reason}

What you can do:
- Review the feedback carefully
- Update your profile with more information
- Resubmit for approval

We're here to help! Feel free to reach out to our support team if you have any questions.

Reapply: https://nikah-network.pk/reapply

© 2026 Intikhab-e-Zauj. All rights reserved.
    `;

    console.log(`📧 Sending rejection email to ${email}...`);

    const result = await transporter.sendMail({
      from: `"Intikhab-e-Zauj" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text: plainTextBody,
      html: htmlBody,
      replyTo: process.env.EMAIL_USER,
    });

    console.log(`✅ Rejection email sent!`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send rejection email:', error instanceof Error ? error.message : error);
    return false;
  }
}
/**
 * Send email verification link
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationLink: string
): Promise<boolean> {
  try {
    const subject = '✉️ Verify Your Email Address - Intikhab-e-Zauj';

    const htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 8px; }
      .content { padding: 20px; background: #f0f9ff; border-radius: 8px; margin: 20px 0; }
      .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; cursor: pointer; }
      .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      .code { font-family: monospace; background: #eee; padding: 10px; display: block; word-break: break-all; font-size: 12px; margin: 10px 0; }
      .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 15px 0; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to Intikhab-e-Zauj!</h1>
      </div>

      <div class="content">
        <p>Hello <strong>${name}</strong>,</p>

        <p>Thank you for registering with Intikhab-e-Zauj. We're excited to have you on board!</p>

        <p>To complete your registration and start exploring potential matches, please verify your email address by clicking the button below:</p>

        <center>
          <a href="${verificationLink}" class="button">Verify Email Address</a>
        </center>

        <p>Or copy and paste this link in your browser:</p>
        <code class="code">${verificationLink}</code>

        <div class="warning">
          <strong>⏰ Important:</strong> This verification link expires in 24 hours. If it expires, you can request a new one from the login page.
        </div>

        <p>Once you verify your email, you'll be able to:</p>
        <ul>
          <li>Complete your profile</li>
          <li>Browse potential matches</li>
          <li>Send and receive proposals</li>
          <li>Connect with others in our community</li>
        </ul>

        <p><strong>Questions?</strong> Contact our support team at support@intikhab-e-zauj.com</p>
      </div>

      <div class="footer">
        <p>© 2026 Intikhab-e-Zauj. All rights reserved.</p>
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </div>
  </body>
</html>
    `;

    const plainTextBody = `
Welcome to Intikhab-e-Zauj!

Hello ${name},

Thank you for registering with Intikhab-e-Zauj. We're excited to have you on board!

To complete your registration, please verify your email by clicking this link:
${verificationLink}

This link expires in 24 hours.

Once verified, you'll be able to:
- Complete your profile
- Browse potential matches
- Send and receive proposals
- Connect with others

Questions? Contact: support@intikhab-e-zauj.com

© 2026 Intikhab-e-Zauj. All rights reserved.
    `;

    console.log(`📧 Sending verification email to ${email}...`);

    const result = await transporter.sendMail({
      from: `"Intikhab-e-Zauj" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text: plainTextBody,
      html: htmlBody,
      replyTo: process.env.EMAIL_USER,
    });

    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error instanceof Error ? error.message : error);
    return false;
  }
}