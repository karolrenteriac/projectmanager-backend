const { Resend } = require("resend");

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.frontendUrl =
      process.env.FRONTEND_URL || "http://localhost:4200";
  }

  async sendInvitationEmail(email, token, role) {
    try {
      const invitationLink = `${this.frontendUrl}/register?token=${token}`;

      const response = await this.resend.emails.send({
        from: "ProjectManager <onboarding@resend.dev>",
        to: email,
        subject: "You have been invited to ProjectManager",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>ProjectManager Invitation</h2>

            <p>You have been invited to join ProjectManager.</p>

            <p>
              <strong>Role:</strong> ${role}
            </p>

            <p>
              Click the button below to accept the invitation:
            </p>

            <a
              href="${invitationLink}"
              style="
                display:inline-block;
                padding:12px 20px;
                background:#6C63FF;
                color:white;
                text-decoration:none;
                border-radius:8px;
                font-weight:bold;
              "
            >
              Accept Invitation
            </a>

            <p style="margin-top:20px;">
              Or copy this link:
            </p>

            <p>
              ${invitationLink}
            </p>

            <hr />

            <small>
              This invitation expires in 7 days.
            </small>
          </div>
        `,
      });

      console.log("✅ Email sent with Resend:", response);

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error("❌ Resend email error:", error);

      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verifyConnection() {
    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY missing");
      }

      return {
        success: true,
        message: "Resend configured correctly",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

let emailServiceInstance = null;

function getEmailService() {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }

  return emailServiceInstance;
}

module.exports = {
  getEmailService,
};