const { Resend } = require("resend");
const nodemailer = require("nodemailer");

let _resend = null;

// ================================
// RESEND CLIENT
// ================================
function getResendClient() {

  if (!_resend) {

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return null;
    }

    _resend = new Resend(apiKey);
  }

  return _resend;
}

// ================================
// GMAIL TRANSPORTER
// ================================
const gmailTransporter = nodemailer.createTransport({

  host: "smtp.gmail.com",

  port: 587,

  secure: false,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },

  tls: {
    rejectUnauthorized: false
  }
});

// ================================
// SEND WITH GMAIL
// ================================
async function sendWithGmail(to, subject, html) {

  await gmailTransporter.sendMail({

    from: `"ProjectManager" <${process.env.EMAIL_USER}>`,

    to,

    subject,

    html
  });

  console.log(`✅ Email sent via Gmail to ${to}`);
}

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
    "You've been invited to join ProjectManager";

  const html = `
    <h2>🚀 You're Invited!</h2>

    <p>
      You have been invited as
      <b>${role}</b>
    </p>

    <p>Click below to register:</p>

    <a href="${invitationLink}">
      Accept Invitation
    </a>

    <br><br>

    <small>
      ${invitationLink}
    </small>
  `;

  try {

    // 🔥 USE GMAIL
    await sendWithGmail(to, subject, html);

    console.log("✅ Invitation email sent successfully");

  } catch (err) {

    console.error("❌ EMAIL ERROR:");
    console.error(err);

    throw err;
  }
}

module.exports = {
  sendInvitationEmail
};