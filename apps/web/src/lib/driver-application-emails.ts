import { escapeHtml } from "@/lib/email-delivery";

export function buildDriverApprovalEmailHtml(params: {
  driverName: string;
  loginEmail: string;
  plainPassword: string;
  driverReferenceId: string;
}): string {
  const name = escapeHtml(params.driverName);
  const email = escapeHtml(params.loginEmail);
  const pwd = escapeHtml(params.plainPassword);
  const ref = escapeHtml(params.driverReferenceId);
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f0f0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);padding:32px 28px;text-align:center;">
              <p style="margin:0 0 8px 0;color:#C9A063;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">SARJ Worldwide</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Application approved</h1>
              <p style="margin:12px 0 0 0;color:rgba(255,255,255,0.85);font-size:14px;line-height:1.5;">Your driver account is ready</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <p style="margin:0 0 16px 0;color:#1a1a1a;font-size:16px;line-height:1.6;">Dear <strong>${name}</strong>,</p>
              <p style="margin:0 0 16px 0;color:#444;font-size:15px;line-height:1.65;">
                Congratulations — your driver registration request has been <strong style="color:#1a1a1a;">reviewed and approved</strong>.
                You may now access the SARJ driver application using the credentials below.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f8f8;border:1px solid #e8e8e8;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 14px 0;color:#888;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;">Sign-in credentials</p>
                    <p style="margin:0 0 10px 0;color:#333;font-size:14px;line-height:1.6;"><strong style="color:#666;display:inline-block;min-width:112px;">Email</strong><span style="font-family:Consolas,monospace;">${email}</span></p>
                    <p style="margin:0 0 10px 0;color:#333;font-size:14px;line-height:1.6;"><strong style="color:#666;display:inline-block;min-width:112px;">Password</strong><span style="font-family:Consolas,monospace;font-weight:600;">${pwd}</span></p>
                    <p style="margin:0;color:#333;font-size:14px;line-height:1.6;"><strong style="color:#666;display:inline-block;min-width:112px;">Driver ID</strong><span style="font-family:Consolas,monospace;">${ref}</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <p style="margin:0 0 12px 0;color:#1a1a1a;font-size:14px;font-weight:600;">Next steps</p>
              <ol style="margin:0;padding:0 0 0 22px;color:#444;font-size:14px;line-height:1.75;">
                <li style="margin-bottom:8px;">Open the <strong>SARJ Driver</strong> mobile app on your device.</li>
                <li style="margin-bottom:8px;">Sign in using the <strong>email</strong> and <strong>password</strong> shown above.</li>
                <li>We recommend <strong>changing your password</strong> after your first successful login.</li>
              </ol>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;">
              <p style="margin:0;padding:14px 16px;background:#fff9f0;border-left:4px solid #C9A063;border-radius:4px;color:#555;font-size:13px;line-height:1.6;">
                <strong style="color:#1a1a1a;">Security:</strong> Treat these credentials as confidential. SARJ Worldwide will never ask you for your password by phone or unsecured links.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f5f5f5;text-align:center;">
              <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">© ${year} SARJ Worldwide. All rights reserved.</p>
              <p style="margin:8px 0 0 0;color:#bbb;font-size:11px;">This is an automated message — please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildDriverRejectionEmailHtml(params: {
  applicantName: string;
  reason: string | null;
}): string {
  const name = escapeHtml(params.applicantName);
  const reasonRaw = params.reason?.trim();
  const reasonHtml = reasonRaw
    ? `<div style="margin:16px 0;padding:16px 18px;background:#f8f8f8;border:1px solid #e5e5e5;border-radius:8px;color:#333;font-size:14px;line-height:1.65;">${escapeHtml(reasonRaw)}</div>`
    : `<p style="margin:16px 0;color:#666;font-size:14px;line-height:1.65;">No additional comments were added by the reviewing team.</p>`;
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f0f0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#2d2d2d 0%,#1a1a1a 100%);padding:32px 28px;text-align:center;">
              <p style="margin:0 0 8px 0;color:#C9A063;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">SARJ Worldwide</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">Application update</h1>
              <p style="margin:12px 0 0 0;color:rgba(255,255,255,0.85);font-size:14px;line-height:1.5;">Driver registration request</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <p style="margin:0 0 16px 0;color:#1a1a1a;font-size:16px;line-height:1.6;">Dear <strong>${name}</strong>,</p>
              <p style="margin:0 0 16px 0;color:#444;font-size:15px;line-height:1.65;">
                Thank you for your interest in joining SARJ Worldwide as a chauffeur driver. We appreciate the time you took to submit your application.
              </p>
              <p style="margin:0 0 8px 0;color:#444;font-size:15px;line-height:1.65;">
                After review, we are unable to <strong>approve</strong> your application at this time.
              </p>
              <p style="margin:0 0 6px 0;color:#1a1a1a;font-size:13px;font-weight:600;">Reason</p>
              ${reasonHtml}
              <p style="margin:20px 0 0 0;color:#666;font-size:14px;line-height:1.65;">
                If you believe this was sent in error, or you would like guidance on future applications, please contact our operations team using the official channels listed on our website.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f5f5f5;text-align:center;">
              <p style="margin:0;color:#999;font-size:12px;line-height:1.5;">© ${year} SARJ Worldwide. All rights reserved.</p>
              <p style="margin:8px 0 0 0;color:#bbb;font-size:11px;">This is an automated message — please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
