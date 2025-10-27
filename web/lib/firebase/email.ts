import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; html: string };

export async function sendMail({ to, subject, html }: Mail) {
  // Accept both EMAIL_* and SMTP_*
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    console.warn("[email] Missing SMTP env; skipping real email send.", { to, subject });
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to, subject, html });
}
