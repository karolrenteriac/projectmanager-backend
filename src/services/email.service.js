const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an invitation email with a registration link containing the token.
 * @param {string} to    - Recipient email address
 * @param {string} token - Secure invitation token
 * @param {string} role  - Role assigned to the invitee
 */
async function sendInvitationEmail(to, token, role) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
  const invitationLink = `${frontendUrl}/auth/register?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject: "You've been invited to join ProjectManager",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Invitation</title>
          <style>
            body { margin: 0; padding: 0; background-color: #f4f4f7; font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 32px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
            .body { padding: 40px 32px; color: #3d3d3d; }
            .body p { font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
            .role-badge { display: inline-block; background-color: #ede9fe; color: #6d28d9; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-bottom: 24px; }
            .cta { text-align: center; margin: 32px 0; }
            .cta a { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; display: inline-block; }
            .footer { padding: 24px 32px; background-color: #f4f4f7; text-align: center; color: #9ca3af; font-size: 12px; }
            .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 You're Invited!</h1>
            </div>
            <div class="body">
              <p>Hello,</p>
              <p>You have been invited to join <strong>ProjectManager</strong>. An account has been set up for you with the following role:</p>
              <span class="role-badge">Role: ${role}</span>
              <p>Click the button below to complete your registration and set up your account:</p>
              <div class="cta">
                <a href="${invitationLink}" target="_blank">Accept Invitation</a>
              </div>
              <hr class="divider" />
              <p style="font-size:13px; color:#6b7280;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="font-size:12px; color:#667eea; word-break: break-all;">${invitationLink}</p>
              <p style="font-size:13px; color:#6b7280;">This invitation will expire in 24 hours. If you weren't expecting this email, you can safely ignore it.</p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} ProjectManager. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error("❌ Resend API error while sending invitation email:", error);
      return;
    }

    console.log(`✅ Invitation email sent to ${to} (id: ${data?.id})`);
  } catch (err) {
    console.error("❌ Unexpected error while sending invitation email:", err.message);
  }
}

module.exports = { sendInvitationEmail };
