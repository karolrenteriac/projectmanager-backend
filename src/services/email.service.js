const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// ======================================
// SEND INVITATION EMAIL
// ======================================
async function sendInvitationEmail(to, token, role) {

  const frontendUrl =
    process.env.FRONTEND_URL ||
    "https://projectmanager-frontend-kohl.vercel.app";

  const invitationLink =
    `${frontendUrl}/auth/register?token=${token}`;

  const subject =
    "You're invited to join ProjectManager";

  const html = `
    <div
      style="
        font-family: Arial, sans-serif;
        background: #f4f4f5;
        padding: 40px 20px;
      "
    >

      <div
        style="
          max-width: 600px;
          margin: auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        "
      >

        <!-- HEADER -->
        <div
          style="
            background: linear-gradient(135deg,#6366f1,#8b5cf6);
            padding: 40px;
            text-align: center;
            color: white;
          "
        >

          <h1 style="margin:0;font-size:32px;">
            ProjectManager
          </h1>

          <p
            style="
              margin-top:10px;
              font-size:16px;
              opacity:0.9;
            "
          >
            Collaborative Research Management Platform
          </p>

        </div>

        <!-- BODY -->
        <div style="padding:40px;">

          <h2
            style="
              margin-top:0;
              color:#111827;
              font-size:28px;
            "
          >
            🚀 You're Invited!
          </h2>

          <p
            style="
              font-size:16px;
              color:#4b5563;
              line-height:1.7;
            "
          >
            You have been invited to join
            <b>ProjectManager</b>
            as:
          </p>

          <div
            style="
              display:inline-block;
              background:#eef2ff;
              color:#4f46e5;
              padding:10px 18px;
              border-radius:999px;
              font-weight:bold;
              margin:15px 0 25px 0;
            "
          >
            ${role}
          </div>

          <p
            style="
              font-size:16px;
              color:#4b5563;
              line-height:1.7;
            "
          >
            Click the button below to accept your invitation and create your account.
          </p>

          <div style="text-align:center;margin:40px 0;">

            <a
              href="${invitationLink}"
              style="
                background: linear-gradient(135deg,#6366f1,#8b5cf6);
                color:white;
                padding:16px 32px;
                border-radius:12px;
                text-decoration:none;
                font-size:16px;
                font-weight:bold;
                display:inline-block;
                box-shadow:0 6px 20px rgba(99,102,241,0.35);
              "
            >
              Accept Invitation
            </a>

          </div>

          <p
            style="
              font-size:14px;
              color:#6b7280;
              line-height:1.6;
            "
          >
            If the button does not work, copy and paste this link into your browser:
          </p>

          <div
            style="
              background:#f9fafb;
              padding:14px;
              border-radius:10px;
              word-break:break-all;
              font-size:13px;
              color:#374151;
            "
          >
            ${invitationLink}
          </div>

        </div>

        <!-- FOOTER -->
        <div
          style="
            background:#f9fafb;
            padding:24px;
            text-align:center;
            font-size:13px;
            color:#6b7280;
          "
        >

          © 2026 ProjectManager

          <br><br>

          Research Collaboration & Academic Project Management Platform

        </div>

      </div>

    </div>
  `;

  try {

    const { data, error } =
      await resend.emails.send({

        from: "ProjectManager <onboarding@resend.dev>",

        to,

        subject,

        html
      });

    if (error) {

      console.error("❌ RESEND ERROR:");
      console.error(error);

      throw new Error(error.message);
    }

    console.log("✅ EMAIL SENT");
    console.log(data);

  } catch (err) {

    console.error("❌ EMAIL ERROR:");
    console.error(err);

    throw err;
  }
}

module.exports = {
  sendInvitationEmail
};