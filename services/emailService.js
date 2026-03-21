const { Resend } = require("resend");
const {
  buildBusinessSubscriptionConfirmationTemplate,
} = require("./emailTemplates/businessSubscriptionConfirmationTemplate");

const hasResendConfig = () => Boolean(process.env.RESEND_API_KEY);

const DEFAULT_FROM = "Complisk <noreply@complisk.com>";
const LOGO_URL =
  "https://complisk.com/Complisk%20logo%202025-12-25%20at%201,00,05%E2%80%AFPM-Picsart-BackgroundRemover%20(1).png";

let cachedResend = null;

const getResend = () => {
  if (cachedResend) return cachedResend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cachedResend = new Resend(apiKey);
  return cachedResend;
};

const resolveFrom = () => process.env.RESEND_FROM || DEFAULT_FROM;

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const textToHtml = (text) =>
  `<pre style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;white-space:pre-wrap;line-height:1.45;">${escapeHtml(text)}</pre>`;

const buildSupportAutoReplyTemplate = (supportMessage) => {
  const name = supportMessage?.name ? String(supportMessage.name) : "there";
  const subject = supportMessage?.subject
    ? String(supportMessage.subject)
    : "your message";

  const safeName = escapeHtml(name);
  const safeSubject = escapeHtml(subject);

  const text = [
    `Hi ${name},`,
    ``,
    `Thanks for contacting Complisk. We received your message and our team will review it.`,
    ``,
    `Subject: ${subject}`,
    ``,
    `This is an automated email sent from noreply@complisk.com.`,
    ``,
    `— Complisk Team`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>We received your message</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="padding:0 0 14px 0;" align="center">
                <img src="${LOGO_URL}" width="160" alt="Complisk" style="display:block;border:0;outline:none;text-decoration:none;max-width:160px;height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border-radius:14px;padding:22px 20px;border:1px solid #e5e7eb;">
                <h1 style="margin:0 0 10px 0;font-size:18px;line-height:1.35;color:#111827;">We received your message</h1>
                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#374151;">Hi ${safeName}, thanks for contacting Complisk. Our team will review your message and get back to you as soon as possible.</p>

                <div style="padding:12px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 14px 0;">
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#111827;"><strong>Subject:</strong> ${safeSubject}</p>
                </div>

                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">This is an automated email sent from <span style="white-space:nowrap;">noreply@complisk.com</span>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 4px 0 4px;" align="center">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">© ${new Date().getFullYear()} Complisk</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: `We received your message: ${subject}`,
    text,
    html,
  };
};

const sendEmail = async ({ from, to, subject, text, html, replyTo }) => {
  if (!hasResendConfig()) {
    return { skipped: true, reason: "RESEND_API_KEY not configured" };
  }

  const resend = getResend();
  if (!resend)
    return { skipped: true, reason: "RESEND_API_KEY not configured" };

  const normalizedTo = Array.isArray(to) ? to : [to];
  const normalizedHtml = html || (text ? textToHtml(text) : undefined);

  const response = await resend.emails.send({
    from,
    to: normalizedTo,
    subject,
    ...(text ? { text } : {}),
    ...(normalizedHtml ? { html: normalizedHtml } : {}),
    ...(replyTo ? { replyTo } : {}),
  });

  return {
    skipped: false,
    provider: "resend",
    id: response?.data?.id || response?.id || null,
  };
};

const sendSupportAutoReply = async (supportMessage) => {
  const from = resolveFrom();
  const { subject, text, html } = buildSupportAutoReplyTemplate(supportMessage);

  const result = await sendEmail({
    from,
    to: supportMessage.email,
    subject,
    text,
    html,
  });

  return result;
};

const sendBusinessSubscriptionConfirmationEmail = async ({
  business,
  subscription,
  template,
}) => {
  if (!business?.email) {
    return { skipped: true, reason: "Business email is not available" };
  }

  const from = resolveFrom();
  const { subject, text, html } = buildBusinessSubscriptionConfirmationTemplate(
    {
      businessName: business?.name,
      subscription,
      template,
    },
  );

  const result = await sendEmail({
    from,
    to: business.email,
    subject,
    text,
    html,
  });

  return result;
};

module.exports = {
  sendSupportAutoReply,
  sendBusinessSubscriptionConfirmationEmail,
};
