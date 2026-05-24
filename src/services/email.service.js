const nodemailer = require("nodemailer");

// ================================
// SMTP TRANSPORTER
// ================================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },

  tls: {
    rejectUnauthorized: false
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
    background: #f4f7fb;
    padding: 40px;
  ">

    <div style="
      max-width: 600px;
      margin: auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    ">

      <div style="
        background: linear-gradient(135deg,#6366f1,#8b5cf6);
        padding: 40px;
        text-align: center;
        color: white;
      ">
        <h1 style="margin:0;">
          ProjectManager
        </h1>

        <p style="margin-top:10px;">
          Research Collaboration Platform
        </p>
      </div>

      <div style="padding:40px;">

        <h2>Hello 👋</h2>

        <p>
          You have been invited to join
          <strong>ProjectManager</strong>
          as:
        </p>

        <div style="
          display:inline-block;
          background:#eef2ff;
          color:#4f46e5;
          padding:10px 18px;
          border-radius:999px;
          font-weight:bold;
          margin:20px 0;
        ">
          ${role}
        </div>

        <p>
          Click the button below to accept your invitation:
        </p>

        <div style="
          margin:35px 0;
          text-align:center;
        ">
          <a
            href="${invitationLink}"
            style="
              background: linear-gradient(135deg,#6366f1,#8b5cf6);
              color:white;
              padding:16px 28px;
              border-radius:10px;
              text-decoration:none;
              font-weight:bold;
              display:inline-block;
            "
          >
            Accept Invitation
          </a>
        </div>

        <p style="color:#666;">
          Or copy this link:
        </p>

        <p style="
          word-break: break-all;
          color:#4f46e5;
        ">
          ${invitationLink}
        </p>

      </div>

    </div>

  </div>
  `;

  try {

    await transporter.sendMail({
      from: `"ProjectManager" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html
    });

    console.log(`✅ Invitation email sent to ${to}`);

  } catch (err) {

    console.error("❌ EMAIL ERROR:");
    console.error(err);

    throw err;
  }
}

module.exports = {
  sendInvitationEmail
};