const { Resend } = require("resend");
const nodemailer = require("nodemailer");

let _resend = null;

// 🔵 RESEND CLIENT
function getResendClient() {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    _resend = new Resend(apiKey);
  }
  return _resend;
}

// 🟢 GMAIL TRANSPORTER
const gmailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendWithGmail(to, subject, html) {
  await gmailTransporter.sendMail({
    from: `"ProjectManager" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });

  console.log(`✅ Email sent via Gmail to ${to}`);
}

/**
 * Sends invitation email (Resend → fallback Gmail)
 */
async function sendInvitationEmail(to, token, role) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
  const invitationLink = `${frontendUrl}/auth/register?token=${token}`;

  const subject = "You've been invited to join ProjectManager";

  const html = `
    <h2>🚀 You're Invited!</h2>
    <p>You have been invited as <b>${role}</b></p>
    <p>Click below:</p>
    <a href="${invitationLink}">${invitationLink}</a>
  `;

  try {
    const resend = getResendClient();

    // 🟣 TRY RESEND
    if (resend) {
      const { data, error } = await resend.emails.send({
        from: "onboarding@resend.dev",
        to,
        subject,
        html
      });

      if (!error) {
        console.log(`✅ Resend email sent to ${to}`);
        return;
      }

      console.warn("⚠️ Resend failed, using Gmail fallback...");
    }

    // 🟢 FALLBACK GMAIL
    await sendWithGmail(to, subject, html);

  } catch (err) {
    console.error("❌ Email error:", err.message);
  }
}

module.exports = { sendInvitationEmail };