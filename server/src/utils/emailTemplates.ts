import { env } from '../config/env.js';

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

// ─── Design tokens (emails cannot use CSS variables, so they live here) ───────
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";
const BRAND = '#2563eb';

type Tone = 'info' | 'danger' | 'success';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  info: { bg: '#dbeafe', fg: '#1d4ed8' },
  danger: { bg: '#fee2e2', fg: '#b91c1c' },
  success: { bg: '#dcfce7', fg: '#15803d' },
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

// ─── Layout ───────────────────────────────────────────────────────────────────
interface Layout {
  /** Inbox preview text (and the line notification banners show). */
  preheader: string;
  badge?: { label: string; tone: Tone };
  heading: string;
  /** One-time code, shown first and large so it can be selected and copied in one go. */
  code?: { value: string; hint: string };
  paragraphs: string[];
  button?: { label: string; url: string };
  /** Small print under the button (security advice, "ignore this email"). */
  notes?: string[];
  footer: string[];
}

function renderHtml(layout: Layout): string {
  const { preheader, badge, heading, code, paragraphs, button, notes = [], footer } = layout;

  const badgeHtml = badge
    ? `<div style="margin:0 0 16px"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${TONES[badge.tone].bg};color:${TONES[badge.tone].fg};font:600 12px ${FONT};letter-spacing:.2px">${escapeHtml(badge.label)}</span></div>`
    : '';

  // user-select:all makes one click / tap select the whole code, which is the closest an email
  // can get to a copy button (clients do not run scripts).
  const codeHtml = code
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px"><tr><td align="center" class="codebox" style="background:#eff6ff;border:1px dashed #93c5fd;border-radius:12px;padding:20px 12px">
        <div class="code" style="font:700 38px ${MONO};letter-spacing:10px;color:#1e3a8a;-webkit-user-select:all;user-select:all;text-align:center;padding-left:10px">${escapeHtml(code.value)}</div>
       </td></tr></table>
       <p class="muted" style="margin:0 0 24px;text-align:center;font:400 12px ${FONT};color:#64748b">${escapeHtml(code.hint)}</p>`
    : '';

  const paragraphsHtml = paragraphs
    .map(
      (line) =>
        `<p class="text" style="margin:0 0 14px;font:400 15px/1.6 ${FONT};color:#334155">${escapeHtml(line)}</p>`,
    )
    .join('');

  // Bulletproof button: a table cell carries the colour so Outlook keeps it.
  const buttonHtml = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr><td align="center" bgcolor="${BRAND}" style="border-radius:10px"><a href="${escapeHtml(button.url)}" style="display:inline-block;padding:13px 26px;font:600 15px ${FONT};color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(button.label)}</a></td></tr></table>`
    : '';

  const notesHtml = notes.length
    ? `<div style="margin-top:22px;padding-top:18px;border-top:1px solid #e2e8f0">${notes
        .map(
          (line) =>
            `<p class="muted" style="margin:0 0 8px;font:400 13px/1.5 ${FONT};color:#64748b">${escapeHtml(line)}</p>`,
        )
        .join('')}</div>`
    : '';

  const footerHtml = footer
    .map((line) => `<p style="margin:0 0 6px">${escapeHtml(line)}</p>`)
    .join('');

  // Invisible padding stops clients from pulling body text into the inbox preview.
  const filler = '&nbsp;&zwnj;'.repeat(40);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(heading)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .bg-page { background: #0b1220 !important; }
    .card { background: #111a2e !important; border-color: #1f2a44 !important; }
    .text { color: #e2e8f0 !important; }
    .heading { color: #f8fafc !important; }
    .muted { color: #94a3b8 !important; }
    .codebox { background: #14213d !important; border-color: #3b82f6 !important; }
    .code { color: #93c5fd !important; }
  }
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .pad { padding: 24px 18px !important; }
    .code { font-size: 30px !important; letter-spacing: 6px !important; }
  }
</style>
</head>
<body class="bg-page" style="margin:0;padding:0;background:#f4f7fb">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#f4f7fb">${escapeHtml(preheader)}${filler}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg-page" bgcolor="#f4f7fb">
  <tr><td align="center" style="padding:32px 12px">
    <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%">
      <tr><td style="padding:0 4px 18px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td align="center" width="34" height="34" bgcolor="${BRAND}" style="width:34px;height:34px;border-radius:9px;color:#ffffff;font:700 18px ${FONT}">P</td>
          <td style="padding-left:10px;font:700 18px ${FONT};color:#0f172a" class="heading">ProjectFlow</td>
        </tr></table>
      </td></tr>
      <tr><td class="card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="pad" style="padding:34px 32px">
          ${badgeHtml}
          <h1 class="heading" style="margin:0 0 18px;font:700 24px/1.3 ${FONT};color:#0f172a">${escapeHtml(heading)}</h1>
          ${codeHtml}
          ${paragraphsHtml}
          ${buttonHtml}
          ${notesHtml}
        </td></tr></table>
      </td></tr>
      <tr><td class="muted" style="padding:20px 8px 0;text-align:center;font:400 12px/1.5 ${FONT};color:#64748b">
        ${footerHtml}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Plain-text twin of the HTML: the same content, code first, for clients that do not render HTML. */
function renderText(layout: Layout): string {
  const { badge, heading, code, paragraphs, button, notes = [], footer } = layout;
  return [
    badge ? `[${badge.label}]` : '',
    heading.toUpperCase(),
    code ? `\n${code.value}\n(${code.hint})\n` : '',
    paragraphs.join('\n\n'),
    button ? `\n${button.label}: ${button.url}` : '',
    notes.length ? `\n${notes.join('\n')}` : '',
    `\n--\n${footer.join('\n')}`,
  ]
    .filter((part) => part !== '')
    .join('\n');
}

function build(subject: string, layout: Layout): EmailContent {
  return { subject, html: renderHtml(layout), text: renderText(layout) };
}

function footerFor(email: string): string[] {
  return [
    `This message was sent to ${email} by ProjectFlow.`,
    env.SUPPORT_EMAIL ? `Questions? Contact ${env.SUPPORT_EMAIL}.` : 'Please do not reply to this email.',
  ];
}

// ─── Emails ───────────────────────────────────────────────────────────────────
interface VerificationArgs {
  name: string;
  email: string;
  code: string;
  ttlMinutes: number;
}

/**
 * The code leads everywhere it can: in the subject (shows in notifications), the inbox preview
 * and, first, in the body, large and select-on-click so it is one tap to copy.
 */
export function verificationEmail({ name, email, code, ttlMinutes }: VerificationArgs): EmailContent {
  const verifyUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/verify-email?email=${encodeURIComponent(email)}`;

  return build(`${code} is your ProjectFlow verification code`, {
    preheader: `Your verification code is ${code}. It expires in ${ttlMinutes} minutes.`,
    badge: { label: 'Email verification', tone: 'info' },
    heading: 'Your verification code',
    code: { value: code, hint: 'Tap or double-click the code to select it, then copy.' },
    paragraphs: [
      `Hi ${name},`,
      `Enter this code to finish creating your ProjectFlow account. It expires in ${ttlMinutes} minutes and works only once.`,
    ],
    button: { label: 'Open the verification page', url: verifyUrl },
    notes: [
      'Never share this code with anyone. ProjectFlow will never ask you for it.',
      "If you didn't create an account, you can safely ignore this email.",
    ],
    footer: footerFor(email),
  });
}

interface AccountStatusArgs {
  name: string;
  email: string;
  active: boolean;
  supportEmail?: string | undefined;
}

/**
 * Sent when an administrator turns an account off or back on. It says what happened and who to
 * contact, and deliberately gives no reason: that conversation belongs with the administrator.
 */
export function accountStatusEmail({ name, email, active, supportEmail }: AccountStatusArgs): EmailContent {
  const base = env.CLIENT_URL.replace(/\/$/, '');

  if (active) {
    return build('Your ProjectFlow account has been reactivated', {
      preheader: 'You can sign in to ProjectFlow again.',
      badge: { label: 'Account reactivated', tone: 'success' },
      heading: 'Welcome back',
      paragraphs: [
        `Hi ${name},`,
        'An administrator has reactivated your ProjectFlow account.',
        'You can sign in again with your existing email and password.',
      ],
      button: { label: 'Sign in', url: `${base}/login` },
      footer: footerFor(email),
    });
  }

  const contact = supportEmail
    ? `If you think this is a mistake, contact your administrator or the support team at ${supportEmail}.`
    : 'If you think this is a mistake, please contact your administrator.';

  return build('Your ProjectFlow account has been deactivated', {
    preheader: 'You have been signed out and can no longer sign in.',
    badge: { label: 'Account deactivated', tone: 'danger' },
    heading: 'Your account has been deactivated',
    paragraphs: [
      `Hi ${name},`,
      'An administrator has deactivated your ProjectFlow account. You have been signed out and can no longer sign in.',
      contact,
    ],
    ...(supportEmail ? { button: { label: 'Contact support', url: `mailto:${supportEmail}` } } : {}),
    footer: footerFor(email),
  });
}
