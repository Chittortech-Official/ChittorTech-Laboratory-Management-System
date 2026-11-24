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
