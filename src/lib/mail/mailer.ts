import nodemailer from 'nodemailer';
import { AccountRequestPayload } from '@/types';

// SMTP Configuration — Server-side only
const smtpHost = process.env.SMTP_HOST || 'smtpout.secureserver.net';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpUser = process.env.SMTP_USER || 'contact@chittortech.in';
const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';
const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_FROM || 'contact@chittortech.in';
const notificationEmail = process.env.NOTIFICATION_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || 'chittortech@gmail.com';

export const isSmtpConfigured = (): boolean => {
  return typeof smtpUser === 'string' && smtpUser.trim().length > 0 && typeof smtpPass === 'string' && smtpPass.trim().length > 0;
};

const createTransporter = () => {
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

/**
 * Escapes special characters to safely interpolate user input into HTML emails
 */
function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface RequestMeta {
  id: string;
  status?: string;
  createdAt?: string;
}

/**
 * Sends notification email to ChittorTech admin (chittortech@gmail.com)
 * and an acknowledgment to the applicant's work email.
 *
 * SENDER / FROM: contact@chittortech.in
 * RECIPIENT / TO: chittortech@gmail.com
 *
 * FORMAT: Strictly vertical layout with each field as an independent block.
 */
export async function sendAccountRequestEmails(payload: AccountRequestPayload, meta?: RequestMeta) {
  if (!isSmtpConfigured()) {
    console.warn('SMTP not configured; skipping email dispatch.');
    return { success: false, error: 'SMTP credentials not configured on server' };
  }

  const transporter = createTransporter();

  const requestId = meta?.id || `REQ-${Date.now()}`;
  const status = meta?.status || 'Pending';
  const submittedAt = meta?.createdAt || new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const safe = {
    fullName: escapeHtml(payload.fullName),
    workEmail: escapeHtml(payload.workEmail),
    companyName: escapeHtml(payload.companyName),
    plantName: escapeHtml(payload.plantName),
    designation: escapeHtml(payload.designation),
    phone: escapeHtml(payload.phone || 'N/A'),
    city: escapeHtml(payload.city),
    state: escapeHtml(payload.state),
    reason: escapeHtml(payload.reason),
    requestId: escapeHtml(requestId),
    status: escapeHtml(status),
    submittedAt: escapeHtml(submittedAt),
  };

  // 1. Vertical Plain Text Format (Strictly matched to specification)
  const plainTextAdmin = `NEW ACCOUNT REQUEST
ChittorTech QA Laboratory Management System
A new account access request has been submitted.

APPLICANT NAME
${payload.fullName}

WORK EMAIL ADDRESS
${payload.workEmail}

COMPANY / ORGANIZATION
${payload.companyName}

PLANT / FACILITY NAME
${payload.plantName}

DESIGNATION / ROLE
${payload.designation}

CONTACT NUMBER
${payload.phone || 'N/A'}

CITY
${payload.city}

STATE
${payload.state}

REASON FOR REQUESTING ACCESS
${payload.reason}

REQUEST INFORMATION
Request ID: ${requestId}
Status: ${status}
Submitted At: ${submittedAt}

ChittorTech
QA Laboratory Management System`;

  // 2. Vertical HTML Email (Independent blocks, no side-by-side columns, Gmail-optimized)
  const htmlAdmin = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Account Request — ChittorTech QA LMS</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Branding Header -->
    <div style="background-color: #0f172a; padding: 24px 28px; text-align: left;">
      <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
        NEW ACCOUNT REQUEST
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">
        ChittorTech QA Laboratory Management System
      </h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">
        A new account access request has been submitted.
      </p>
    </div>

    <!-- Vertical Fields Section (Every field in its own independent vertical block) -->
    <div style="padding: 28px 28px 20px 28px;">
      
      <!-- APPLICANT NAME -->
      <div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px;">
          APPLICANT NAME
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #0f172a; line-height: 1.4; word-break: break-word;">
          ${safe.fullName}
        </div>
      </div>

      <!-- WORK EMAIL ADDRESS -->
      <div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px;">
          WORK EMAIL ADDRESS
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #0284c7; line-height: 1.4; word-break: break-word;">
          <a href="mailto:${safe.workEmail}" style="color: #0284c7; text-decoration: none;">${safe.workEmail}</a>
        </div>
      </div>

      <!-- COMPANY / ORGANIZATION -->
      <div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px;">
          COMPANY / ORGANIZATION
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #0f172a; line-height: 1.4; word-break: break-word;">
          ${safe.companyName}
        </div>
      </div>

      <!-- PLANT / FACILITY NAME -->
      <div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px;">
          PLANT / FACILITY NAME
        </div>
        <div style="font-size: 15px; font-weight: 600; color: #0f172a; line-height: 1.4; word-break: break-word;">
          ${safe.plantName}
        </div>
      </div>

      <!-- DESIGNATION / ROLE -->
      <div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px;">
          DESIGNATION / ROLE
        </div>
        <div style="font-size: 15px; font-weight: 500; color: #0f172a; line-height: 1.4; word-break: break-word;">
          ${safe.designation}
        </div>
      </div>

      <!-- CONTACT NUMBER -->
      <div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px;">
          CONTACT NUMBER
        </div>
        <div style="font-size: 15px; font-weight: 500; color: #0f172a; line-height: 1.4; word-break: break-word;">
          ${safe.phone}
        </div>
      </div>

      <!-- CITY -->
      <div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px;">
          CITY
        </div>
        <div style="font-size: 15px; font-weight: 500; color: #0f172a; line-height: 1.4; word-break: break-word;">
          ${safe.city}
        </div>
      </div>

      <!-- STATE -->
      <div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px;">
          STATE
        </div>
        <div style="font-size: 15px; font-weight: 500; color: #0f172a; line-height: 1.4; word-break: break-word;">
          ${safe.state}
        </div>
      </div>

      <!-- REASON FOR REQUESTING ACCESS -->
      <div style="margin-bottom: 24px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
          REASON FOR REQUESTING ACCESS
        </div>
        <div style="font-size: 14px; font-weight: 400; color: #334155; line-height: 1.6; background-color: #f8fafc; padding: 12px 14px; border-radius: 6px; border: 1px solid #e2e8f0; word-break: break-word;">
          ${safe.reason}
        </div>
      </div>

      <!-- REQUEST INFORMATION -->
      <div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
        <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">
          REQUEST INFORMATION
        </div>
        <div style="font-size: 13px; color: #1e293b; margin-bottom: 6px;">
          <strong>Request ID:</strong> <span style="font-family: monospace; font-size: 12px; color: #475569;">${safe.requestId}</span>
        </div>
        <div style="font-size: 13px; color: #1e293b; margin-bottom: 6px;">
          <strong>Status:</strong> <span style="display: inline-block; padding: 2px 8px; background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; border-radius: 4px; text-transform: uppercase;">${safe.status}</span>
        </div>
        <div style="font-size: 13px; color: #1e293b;">
          <strong>Submitted At:</strong> ${safe.submittedAt}
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center;">
      <p style="margin: 0; font-size: 13px; font-weight: 700; color: #0f172a;">
        ChittorTech
      </p>
      <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">
        QA Laboratory Management System
      </p>
      <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
        Industrial Quality Assurance & Materials Testing Suite • Confidential
      </p>
    </div>

  </div>
</body>
</html>`;

  // Admin Notification Email Options (ONLY chittortech@gmail.com receives this)
  const adminMailOptions = {
    from: `"ChittorTech QA LMS" <${senderEmail}>`,
    to: notificationEmail,
    subject: `🚨 [New Account Request] ${payload.companyName} — ${payload.plantName}`,
    text: plainTextAdmin,
    html: htmlAdmin,
  };

  try {
    const adminResult = await transporter.sendMail(adminMailOptions);
    return { success: true, messageId: adminResult.messageId };
  } catch (error: any) {
    console.error('SMTP email delivery error:', error);
    return { success: false, error: error.message };
  }
}

export interface SupportTicketEmailPayload {
  ticketId: string;
  fullName: string;
  email: string;
  issueCategory: string;
  issueTitle: string;
  description: string;
  affectedModule: string;
  priority: string;
  createdAt: string;
}

/**
 * Sends support ticket notification to ChittorTech Support & acknowledgement to the user.
 */
export async function sendSupportTicketEmails(ticket: SupportTicketEmailPayload) {
  if (!isSmtpConfigured()) {
    return { success: false, error: 'SMTP credentials not configured on server' };
  }

  const transporter = createTransporter();
  const safe = {
    ticketId: escapeHtml(ticket.ticketId),
    fullName: escapeHtml(ticket.fullName),
    email: escapeHtml(ticket.email),
    category: escapeHtml(ticket.issueCategory),
    title: escapeHtml(ticket.issueTitle),
    description: escapeHtml(ticket.description),
    module: escapeHtml(ticket.affectedModule),
    priority: escapeHtml(ticket.priority),
  };

  try {
    // Send User Acknowledgement & Internal Support Notification in parallel
    await Promise.all([
      transporter.sendMail({
        from: `"ChittorTech Support" <${senderEmail}>`,
        to: ticket.email,
        subject: `[${ticket.ticketId}] Support Request Received — ${ticket.issueTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
            <div style="background: #eaf3ff; padding: 20px 24px; border-bottom: 1px solid #d6e8ff;">
              <h2 style="margin: 0; color: #2563eb; font-size: 18px;">ChittorTech Support Confirmation</h2>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">QA Laboratory Management System</p>
            </div>
            <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
              <p>Dear <strong>${safe.fullName}</strong>,</p>
              <p>Your support request has been submitted successfully. Our ChittorTech support team will review your request and respond shortly.</p>
              <div style="background: #f5f8fc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 13px;">
                <div><strong>Ticket ID:</strong> ${safe.ticketId}</div>
                <div><strong>Category:</strong> ${safe.category}</div>
                <div><strong>Module:</strong> ${safe.module}</div>
                <div><strong>Priority:</strong> ${safe.priority}</div>
                <div><strong>Title:</strong> ${safe.title}</div>
              </div>
              <p style="font-size: 12px; color: #64748b;">Official Support: business@chittortech.in | contact@chittortech.in | +91 75974 51057</p>
            </div>
          </div>
        `,
      }),
      transporter.sendMail({
        from: `"ChittorTech Support System" <${senderEmail}>`,
        to: 'contact@chittortech.in',
        subject: `[${ticket.priority}] ${ticket.ticketId}: ${ticket.issueTitle}`,
        html: `
          <div style="font-family: sans-serif; padding: 16px; color: #334155;">
            <h3>New Support Ticket: ${safe.ticketId}</h3>
            <p><strong>From:</strong> ${safe.fullName} (${safe.email})</p>
            <p><strong>Category:</strong> ${safe.category} | <strong>Module:</strong> ${safe.module} | <strong>Priority:</strong> ${safe.priority}</p>
            <p><strong>Title:</strong> ${safe.title}</p>
            <p><strong>Description:</strong><br/>${safe.description.replace(/\n/g, '<br/>')}</p>
          </div>
        `,
      }),
    ]);

    return { success: true };
  } catch (error: any) {
    console.error('Support email delivery error:', error);
    return { success: false, error: error.message };
  }
}

export interface SupportTicketStatusEmailInput {
  ticketId: string;
  fullName: string;
  email: string;
  issueCategory: string;
  issueTitle: string;
  affectedModule: string;
  priority: string;
  status: string;
  adminNotes?: string | null;
}

const STATUS_EMAIL_STYLES: Record<
  string,
  {
    headerBg: string;
    headerBorder: string;
    titleColor: string;
    badgeBg: string;
    badgeText: string;
    heading: string;
    subjectPrefix: string;
    intro: string;
  }
> = {
  Resolved: {
    headerBg: '#dcfce7',
    headerBorder: '#bbf7d0',
    titleColor: '#15803d',
    badgeBg: '#dcfce7',
    badgeText: '#15803d',
    heading: 'Your Support Ticket Has Been Resolved',
    subjectPrefix: 'Issue Resolved',
    intro:
      'Good news — our ChittorTech engineering & support team has resolved your reported issue. Please review the details below and verify on your end.',
  },
  'In Progress': {
    headerBg: '#eaf3ff',
    headerBorder: '#d6e8ff',
    titleColor: '#2563eb',
    badgeBg: '#dbeafe',
    badgeText: '#2563eb',
    heading: 'Your Support Ticket Is In Progress',
    subjectPrefix: 'In Progress',
    intro:
      'Our ChittorTech support team is actively investigating and working on your request. We will notify you as soon as there is another update.',
  },
  'Awaiting User Response': {
    headerBg: '#fef3c7',
    headerBorder: '#fde68a',
    titleColor: '#b45309',
    badgeBg: '#fef3c7',
    badgeText: '#b45309',
    heading: 'Action Needed: Awaiting Your Response',
    subjectPrefix: 'Awaiting Response',
    intro:
      'Our support team needs a bit more information from you to proceed with your request. Please reply to this email or contact us using the details below.',
  },
  Closed: {
    headerBg: '#f1f5f9',
    headerBorder: '#e2e8f0',
    titleColor: '#475569',
    badgeBg: '#f1f5f9',
    badgeText: '#475569',
    heading: 'Support Ticket Closed',
    subjectPrefix: 'Ticket Closed',
    intro:
      'Your support ticket has been marked as Closed. If you still experience this issue, feel free to open a new support request anytime.',
  },
};

export async function sendSupportTicketStatusEmail(ticket: SupportTicketStatusEmailInput) {
  if (!isSmtpConfigured()) {
    return { success: false, skipped: true };
  }

  const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_USER;
  if (!senderEmail) {
    return { success: false, skipped: true };
  }

  const style = STATUS_EMAIL_STYLES[ticket.status] || {
    headerBg: '#eaf3ff',
    headerBorder: '#d6e8ff',
    titleColor: '#2563eb',
    badgeBg: '#eaf3ff',
    badgeText: '#2563eb',
    heading: `Support Ticket Status Updated: ${ticket.status}`,
    subjectPrefix: `Status: ${ticket.status}`,
    intro: `The status of your support ticket has been updated to ${ticket.status}.`,
  };

  const transporter = createTransporter();
  const safe = {
    ticketId: escapeHtml(ticket.ticketId),
    fullName: escapeHtml(ticket.fullName),
    category: escapeHtml(ticket.issueCategory),
    title: escapeHtml(ticket.issueTitle),
    module: escapeHtml(ticket.affectedModule),
    priority: escapeHtml(ticket.priority),
    status: escapeHtml(ticket.status),
    adminNotes: ticket.adminNotes ? escapeHtml(ticket.adminNotes) : '',
  };

  const notesBlock = safe.adminNotes
    ? `
      <div style="background: #ffffff; border-left: 3px solid ${style.titleColor}; padding: 12px 14px; margin: 16px 0; border-radius: 4px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Support Team Note</div>
        <div style="font-size: 13px; color: #334155;">${safe.adminNotes.replace(/\n/g, '<br/>')}</div>
      </div>
    `
    : '';

  try {
    await transporter.sendMail({
      from: `"ChittorTech Support" <${senderEmail}>`,
      to: ticket.email,
      subject: `[${ticket.ticketId}] ${style.subjectPrefix} — ${ticket.issueTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="background: ${style.headerBg}; padding: 20px 24px; border-bottom: 1px solid ${style.headerBorder};">
            <h2 style="margin: 0; color: ${style.titleColor}; font-size: 18px;">${escapeHtml(style.heading)}</h2>
            <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">ChittorTech QA Laboratory Management System</p>
          </div>
          <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
            <p>Dear <strong>${safe.fullName}</strong>,</p>
            <p>${escapeHtml(style.intro)}</p>
            <div style="background: #f5f8fc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 13px;">
              <div><strong>Ticket ID:</strong> ${safe.ticketId}</div>
              <div><strong>Status:</strong> <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; background: ${style.badgeBg}; color: ${style.badgeText}; font-weight: 600; font-size: 12px;">${safe.status}</span></div>
              <div><strong>Category:</strong> ${safe.category}</div>
              <div><strong>Module:</strong> ${safe.module}</div>
              <div><strong>Priority:</strong> ${safe.priority}</div>
              <div><strong>Title:</strong> ${safe.title}</div>
            </div>
            ${notesBlock}
            <p style="font-size: 12px; color: #64748b;">Official Support: business@chittortech.in | contact@chittortech.in | +91 75974 51057</p>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Support status email delivery error:', error);
    return { success: false, error: error.message };
  }
}
