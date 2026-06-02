import { transporter } from "../config/nodemailer";

export const sendOrganizationInvite = async (
  email: string,
  token: string,
  organizationName: string
) => {
  const inviteUrl =
    `${process.env.CLIENT_URL}/invite/${token}`;

  await transporter.sendMail({
    from: `"Syntra" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Invitation to join ${organizationName} on Syntra`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
      </head>

      <body style="
        margin:0;
        padding:0;
        background:#f5f7fb;
        font-family:Inter,Segoe UI,sans-serif;
      ">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
        >
          <tr>
            <td align="center">

              <table
                width="600"
                cellpadding="0"
                cellspacing="0"
                style="
                  background:#ffffff;
                  margin:40px auto;
                  border-radius:16px;
                  overflow:hidden;
                  box-shadow:0 10px 30px rgba(0,0,0,0.08);
                "
              >

                <tr>
                  <td
                    style="
                      background:#4f46e5;
                      padding:32px;
                      text-align:center;
                    "
                  >
                    <h1
                      style="
                        color:white;
                        margin:0;
                        font-size:32px;
                      "
                    >
                      Syntra 🚀
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:40px;">
                    <h2
                      style="
                        margin-top:0;
                        color:#111827;
                      "
                    >
                      You're Invited!
                    </h2>

                    <p
                      style="
                        color:#4b5563;
                        font-size:16px;
                        line-height:1.7;
                      "
                    >
                      You have been invited to join
                      <strong>${organizationName}</strong>
                      on Syntra.
                    </p>

                    <p
                      style="
                        color:#4b5563;
                        font-size:16px;
                        line-height:1.7;
                      "
                    >
                      Accept the invitation below to
                      collaborate with your team.
                    </p>

                    <div
                      style="
                        text-align:center;
                        margin:40px 0;
                      "
                    >
                      <a
                        href="${inviteUrl}"
                        style="
                          background:#4f46e5;
                          color:white;
                          text-decoration:none;
                          padding:16px 32px;
                          border-radius:12px;
                          font-size:16px;
                          font-weight:600;
                          display:inline-block;
                        "
                      >
                        Accept Invitation
                      </a>
                    </div>

                    <p
                      style="
                        color:#6b7280;
                        font-size:14px;
                        line-height:1.7;
                      "
                    >
                      If the button doesn't work,
                      copy and paste the following link
                      into your browser:
                    </p>

                    <p
                      style="
                        word-break:break-all;
                        color:#4f46e5;
                        font-size:14px;
                      "
                    >
                      ${inviteUrl}
                    </p>

                    <hr
                      style="
                        border:none;
                        border-top:1px solid #e5e7eb;
                        margin:32px 0;
                      "
                    />

                    <p
                      style="
                        color:#9ca3af;
                        font-size:13px;
                        text-align:center;
                      "
                    >
                      This invitation was sent through
                      Syntra Workspace.
                    </p>

                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
    `,
  });
};