const nodemailer = require("nodemailer");
const dns = require("dns").promises;

/**
 * 🔥 FORCE IPv4 - Critical for Railway
 * Railway has IPv6 outbound disabled, so we must prefer IPv4
 */
dns.setDefaultResultOrder("ipv4first");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize Gmail SMTP transporter with robust configuration
   */
  initializeTransporter() {
    const config = {
      // ✅ CHANGED: Port 465 (SSL/TLS) instead of 587
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      
      // ✅ CHANGED: secure: true for port 465
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },

      // ✅ CRITICAL: Force IPv4 for Railway (IPv6 disabled)
      family: 4,

      // ✅ Robust timeouts
      connectionTimeout: parseInt(process.env.SMTP_TIMEOUT || "30000"),
      socketTimeout: parseInt(process.env.SMTP_TIMEOUT || "30000"),

      // ✅ Connection pool (reuse connections)
      pool: process.env.SMTP_POOL === "true",
      maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || "5"),
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 50,

      // ✅ TLS options
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
        minVersion: "TLSv1.2",
      },

      // Logging
      logger: process.env.NODE_ENV === "development",
      debug: process.env.NODE_ENV === "development",
    };

    try {
      this.transporter = nodemailer.createTransport(config);
      console.log("✅ EmailService initialized with:", {
        host: config.host,
        port: config.port,
        secure: config.secure,
        family: config.family,
        timeout: config.connectionTimeout,
      });
    } catch (error) {
      console.error("❌ EmailService initialization failed:", error.message);
      throw error;
    }
  }

  /**
   * Send email with automatic retry
   * @param {Object} mailOptions - { from, to, subject, html, text }
   * @param {number} retries - Number of retry attempts (default: 3)
   */
  async sendMail(mailOptions, retries = 3) {
    const maxRetries = retries;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `📧 Attempt ${attempt}/${maxRetries}: Sending email to ${mailOptions.to}`
        );

        // Validate required fields
        if (!mailOptions.to || !mailOptions.subject) {
          throw new Error("Missing required fields: to, subject");
        }

        // Send with timeout race
        const response = await Promise.race([
          this.transporter.sendMail(mailOptions),
          this.createTimeout(
            parseInt(process.env.SMTP_TIMEOUT || "30000")
          ),
        ]);

        console.log(
          `✅ Email sent successfully to ${mailOptions.to}:`,
          response.messageId
        );

        return {
          success: true,
          messageId: response.messageId,
          timestamp: new Date(),
        };
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, {
          error: error.message,
          code: error.code,
          command: error.command,
        });

        // Don't retry on validation errors
        if (error.message.includes("Missing required fields")) {
          throw error;
        }

        // If last attempt, throw
        if (attempt === maxRetries) {
          const userFriendlyMsg = this.translateError(error);
          throw new Error(userFriendlyMsg);
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error("Failed to send email after retries");
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(to, token, role) {
    const frontendUrl =
      process.env.FRONTEND_URL ||
      "https://projectmanager-frontend-kohl.vercel.app";

    const invitationLink =
      `${frontendUrl}/auth/register?token=${token}`;

    const htmlContent = `
    <div style="
      font-family: Arial, sans-serif;
      background: #f4f4f4;
      padding: 40px;
    ">

      <div style="
        max-width: 600px;
        margin: auto;
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      ">

        <div style="
          background: linear-gradient(135deg,#6C63FF,#8B5CF6);
          padding: 40px;
          text-align: center;
          color: white;
        ">
          <h1 style="margin:0;">ProjectManager</h1>
          <p style="margin-top:10px;opacity:0.9;">Team Collaboration Platform</p>
        </div>

        <div style="padding:40px;">
          <h2 style="margin-top:0;color:#111827;">🚀 You're Invited!</h2>
          <p style="color:#4B5563;line-height:1.6;">
            You have been invited to join <strong>ProjectManager</strong> as:
          </p>

          <div style="
            display:inline-block;
            background:#EEF2FF;
            color:#6C63FF;
            padding:10px 18px;
            border-radius:999px;
            font-weight:bold;
            margin:20px 0;
          ">
            ${role}
          </div>

          <p style="color:#4B5563;line-height:1.6;">
            Click below to create your account.
          </p>

          <div style="text-align:center;margin:40px 0;">
            <a href="${invitationLink}" style="
              background:linear-gradient(135deg,#6C63FF,#8B5CF6);
              color:white;
              padding:16px 28px;
              border-radius:12px;
              text-decoration:none;
              font-weight:bold;
              display:inline-block;
            ">
              Accept Invitation
            </a>
          </div>

          <p style="color:#9CA3AF;font-size:13px;word-break:break-all;">
            Or copy this link: ${invitationLink}
          </p>

          <hr style="border:none;border-top:1px solid #E5E7EB;margin:30px 0;">

          <p style="color:#9CA3AF;font-size:11px;">
            This invitation expires in 7 days. If you did not expect this invitation, please ignore this email.
          </p>
        </div>

      </div>

    </div>
    `;

    const textContent = `
    ProjectManager - Invitation

    You're invited to join ProjectManager as: ${role}

    Click here to accept: ${invitationLink}

    This invitation expires in 7 days.
    `;

    try {
      const result = await this.sendMail({
        from: `"ProjectManager" <${process.env.SMTP_USER}>`,
        to,
        subject: "🎉 You're invited to join ProjectManager",
        html: htmlContent,
        text: textContent,
      });

      console.log(`✅ Invitation email sent to ${to}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send invitation email to ${to}:`, error.message);
      throw error;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log("✅ SMTP connection verified successfully");
      return { success: true, message: "SMTP connection verified" };
    } catch (error) {
      console.error("❌ SMTP connection failed:", error.message);
      return {
        success: false,
        message: error.message,
        code: error.code,
      };
    }
  }

  // ============ HELPERS ============

  createTimeout(ms) {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`SMTP timeout after ${ms}ms`)),
        ms
      )
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Translate technical SMTP errors to user-friendly messages
   */
  translateError(error) {
    const errorMap = {
      "ENOTFOUND": "DNS resolution failed. Check SMTP_HOST.",
      "ENETUNREACH": "Network unreachable. Check IPv4 connectivity.",
      "ECONNREFUSED": "Connection refused. Check SMTP_HOST and SMTP_PORT.",
      "ECONNRESET": "Connection reset by server.",
      "ETIMEDOUT": "Connection timeout. Check network and SMTP server.",
      "EHOSTUNREACH": "Host unreachable. Check firewall rules.",
      "InvalidLoginError": "Invalid SMTP credentials. Use App Password for Gmail.",
      "AuthenticationFailed": "Authentication failed. Verify App Password.",
    };

    return (
      errorMap[error.code] ||
      errorMap[error.message] ||
      error.message ||
      "Failed to send email. Please try again."
    );
  }
}

// ============ SINGLETON PATTERN ============
let emailService = null;

function getEmailService() {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
}

module.exports = {
  EmailService,
  getEmailService,
};