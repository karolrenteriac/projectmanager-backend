const nodemailer = require("nodemailer");
const dns = require("dns");

// 🔥 FORCE IPV4
dns.setDefaultResultOrder("ipv4first");

// ================================
// GMAIL SMTP TRANSPORTER
// ================================
const gmailTransporter = nodemailer.createTransport({

  host: "smtp.gmail.com",

  port: 587,

  secure: false,

  requireTLS: true,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },

  tls: {
    rejectUnauthorized: false,
    family: 4
  }
});

// ================================
// SEND INVITATION EMAIL
// ================================
async function sendInvitationEmail(to, token, role) {

  const frontendUrl =
    process.env.FRONTEND_URL ||
    "https://projectmanager-frontend-kohl.vercel.app";

  const invitationLink =
    `${frontendUrl}/auth/register?token=${token}`;

  const subject =
    "You're invited to join ProjectManager";

  const html = `
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

        <h1 style="margin:0;">
          ProjectManager
        </h1>

        <p style="
          margin-top:10px;
          opacity:0.9;
        ">
          Team Collaboration Platform
        </p>

      </div>

      <div style="padding:40px;">

        <h2 style="
          margin-top:0;
          color:#111827;
        ">
          🚀 You're Invited!
        </h2>

        <p style="
          color:#4B5563;
          line-height:1.6;
        ">
          You have been invited to join
          <strong>ProjectManager</strong>
          as:
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

        <p style="
          color:#4B5563;
          line-height:1.6;
        ">
          Click below to create your account.
        </p>

        <div style="
          text-align:center;
          margin:40px 0;
        ">

          <a
            href="${invitationLink}"
            style="
              background:linear-gradient(135deg,#6C63FF,#8B5CF6);
              color:white;
              padding:16px 28px;
              border-radius:12px;
              text-decoration:none;
              font-weight:bold;
              display:inline-block;
            "
          >
            Accept Invitation
          </a>

        </div>

        <p style="
          color:#9CA3AF;
          font-size:13px;
          word-break:break-all;
        ">
          ${invitationLink}
        </p>

      </div>

    </div>

  </div>
  `;

  try {

    // 🔥 VERIFY CONNECTION
    await gmailTransporter.verify();

    console.log("✅ SMTP READY");

    // 🔥 SEND EMAIL
    await gmailTransporter.sendMail({

      from: `"ProjectManager" <${process.env.SMTP_USER}>`,

      to,

      subject,

      html
    });

    console.log(`✅ Email sent to ${to}`);

  } catch (err) {

    console.error("❌ EMAIL ERROR:");

    console.error(err);

    throw err;
  }
}

module.exports = {
  sendInvitationEmail
};