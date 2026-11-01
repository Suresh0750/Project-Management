import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  const transport = getTransporter();

  if (!transport) {
    console.info(`[mail:dev] To: ${mail.to}\n[mail:dev] Subject: ${mail.subject}\n${mail.text}`);
    return;
  }

  await transport.sendMail({ from: env.SMTP_FROM, ...mail });
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export function verificationEmail(name: string, code: string, ttlMinutes: number): Omit<Mail, 'to'> {
  const text =
    `Hi ${name},\n\n` +
    `Your ProjectFlow verification code is: ${code}\n\n` +
    `It expires in ${ttlMinutes} minutes. If you did not create an account, ignore this email.\n`;

  const html =
    `<p>Hi ${escapeHtml(name)},</p>` +
    `<p>Your ProjectFlow verification code is:</p>` +
    `<p style="font-size:28px;font-weight:700;letter-spacing:6px">${escapeHtml(code)}</p>` +
    `<p>It expires in ${ttlMinutes} minutes. If you did not create an account, ignore this email.</p>`;

  return { subject: 'Your ProjectFlow verification code', text, html };
}
