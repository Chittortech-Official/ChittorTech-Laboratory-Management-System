import nodemailer from 'nodemailer';
import { AccountRequestPayload } from '@/types';

// SMTP Configuration — Server-side only
const smtpHost = process.env.SMTP_HOST || 'smtpout.secureserver.net';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpUser = process.env.SMTP_USER || 'contact@chittortech.in';
const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';
const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_FROM || 'contact@chittortech.in';
const notificationEmail = (process.env.NOTIFICATION_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || '').trim();

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

  // Admin Notification Email Options (Uses NOTIFICATION_EMAIL env var; never hardcoded)
  if (!notificationEmail) {
    console.error('NOTIFICATION_EMAIL is not configured on server.');
    return {
      success: false,
      applicantSent: false,
      adminSent: false,
      error: 'Administrator notification email (NOTIFICATION_EMAIL) is not configured.',
    };
  }

  const adminMailOptions = {
    from: `"ChittorTech QA LMS" <${senderEmail}>`,
    to: notificationEmail,
    subject: `[New Account Request] ${payload.companyName} – ${payload.plantName}`,
    text: plainTextAdmin,
    html: htmlAdmin,
  };

  // Applicant Acknowledgement Email Options
  const plainTextApplicant = `ACCOUNT REQUEST RECEIVED
ChittorTech QA Laboratory Management System

Dear ${payload.fullName},

Thank you for submitting an Account Request for ChittorTech QA Laboratory Management System. Your request has been received and queued for review by our team.

REQUEST SUMMARY
Request Reference ID: ${requestId}
Company / Organization: ${payload.companyName}
Plant / Facility Name: ${payload.plantName}
Current Status: Pending
Submitted At: ${submittedAt}

IMPORTANT NOTICE
Please note that submitting an account request does not mean your account has already been approved. Our team will review your facility details and notify you via email once a decision is made.

Official Support: business@chittortech.in | contact@chittortech.in | +91 75974 51057`;

  const htmlApplicant = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Request Received — ChittorTech QA LMS</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f5f8fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
    <div style="background-color: #eaf3ff; padding: 22px 26px; border-bottom: 1px solid #d6e8ff;">
      <div style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px;">
        ACCOUNT REQUEST RECEIVED
      </div>
      <h2 style="margin: 0; color: #1e3a8a; font-size: 19px;">ChittorTech QA Laboratory Management System</h2>
    </div>
    <div style="padding: 24px 26px; font-size: 14px; line-height: 1.6; color: #334155;">
      <p style="margin-top: 0;">Dear <strong>${safe.fullName}</strong>,</p>
      <p>Your Account Request has been successfully received by the ChittorTech team and is currently under review.</p>

      <div style="background-color: #f5f8fc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 18px 0; font-size: 13px;">
        <div style="margin-bottom: 6px;"><strong>Request Reference ID:</strong> <span style="font-family: monospace; color: #2563eb; font-weight: 700;">${safe.requestId}</span></div>
        <div style="margin-bottom: 6px;"><strong>Company Name:</strong> ${safe.companyName}</div>
        <div style="margin-bottom: 6px;"><strong>Plant Name:</strong> ${safe.plantName}</div>
        <div style="margin-bottom: 6px;"><strong>Current Status:</strong> <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; background-color: #fef3c7; color: #b45309; font-weight: 700; font-size: 11px; text-transform: uppercase;">Pending</span></div>
        <div><strong>Submitted At:</strong> ${safe.submittedAt}</div>
      </div>

      <div style="background-color: #fef3c7; border-left: 3px solid #b45309; padding: 12px 14px; border-radius: 4px; font-size: 13px; color: #78350f; margin: 18px 0;">
        <strong>Important Notice:</strong> Submitting an Account Request does <strong>not</strong> mean that an account has already been approved. Our team will review your request and send you an update once it is processed.
      </div>

      <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Official Support: business@chittortech.in | contact@chittortech.in | +91 75974 51057</p>
    </div>
  </div>
</body>
</html>`;

  const applicantMailOptions = {
    from: `"ChittorTech QA LMS" <${senderEmail}>`,
    to: payload.workEmail,
    subject: '[ChittorTech] Your Account Request Has Been Received',
    text: plainTextApplicant,
    html: htmlApplicant,
  };

  try {
    const [applicantResult, adminResult] = await Promise.allSettled([
      transporter.sendMail(applicantMailOptions),
      transporter.sendMail(adminMailOptions),
    ]);

    const applicantSent = applicantResult.status === 'fulfilled';
    const adminSent = adminResult.status === 'fulfilled';

    const errors: string[] = [];
    if (applicantResult.status === 'rejected') {
      errors.push(`Applicant email failed: ${applicantResult.reason?.message || 'Unknown error'}`);
    }
    if (adminResult.status === 'rejected') {
      errors.push(`Admin email failed: ${adminResult.reason?.message || 'Unknown error'}`);
    }

    if (errors.length > 0) {
      console.error('Account request email partial/full error:', errors.join(' | '));
    }

    return {
      success: applicantSent && adminSent,
      applicantSent,
      adminSent,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  } catch (error: any) {
    console.error('SMTP email delivery error:', error?.message || error);
    return {
      success: false,
      applicantSent: false,
      adminSent: false,
      error: error?.message || 'SMTP delivery failed',
    };
  }
}

export interface AccountRequestStatusEmailInput {
  requestId: string;
  fullName: string;
  workEmail: string;
  companyName: string;
  plantName: string;
  status: 'approved' | 'rejected';
  adminNotes?: string | null;
}

/**
 * Sends Approved or Rejected status update email to the Account Request applicant.
 */
export async function sendAccountRequestStatusEmail(input: AccountRequestStatusEmailInput) {
  if (!isSmtpConfigured()) {
    return { success: false, error: 'SMTP credentials not configured on server' };
  }

  const transporter = createTransporter();
  const isApproved = input.status === 'approved';
  const safe = {
    requestId: escapeHtml(input.requestId),
    fullName: escapeHtml(input.fullName),
    companyName: escapeHtml(input.companyName),
    plantName: escapeHtml(input.plantName),
    adminNotes: input.adminNotes ? escapeHtml(input.adminNotes) : '',
  };

  const subject = isApproved
    ? '[ChittorTech] Your Account Request Has Been Approved'
    : '[ChittorTech] Update on Your Account Request';

  const headerBg = isApproved ? '#dcfce7' : '#f1f5f9';
  const headerBorder = isApproved ? '#bbf7d0' : '#e2e8f0';
  const titleColor = isApproved ? '#15803d' : '#334155';
  const badgeBg = isApproved ? '#dcfce7' : '#fee2e2';
  const badgeText = isApproved ? '#15803d' : '#b91c1c';
  const heading = isApproved ? 'Account Request Approved' : 'Update on Your Account Request';

  const notesHtml = safe.adminNotes
    ? `<div style="background: #ffffff; border-left: 3px solid ${titleColor}; padding: 12px 14px; margin: 16px 0; border-radius: 4px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
         <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Administrator Notes</div>
         <div style="font-size: 13px; color: #334155;">${safe.adminNotes.replace(/\n/g, '<br/>')}</div>
       </div>`
    : '';

  const bodyCopy = isApproved
    ? `<p>Congratulations! Your Account Request for <strong>${safe.companyName} – ${safe.plantName}</strong> has been <strong>approved</strong> by the ChittorTech administration team.</p>
       <p><strong>Next Steps:</strong> Your account credentials / onboarding instructions will be shared with your registered work email address, after which you can sign in at <a href="https://chittortech-laboratory-management-s.vercel.app" style="color: #2563eb;">ChittorTech QA Laboratory Management System</a>.</p>`
    : `<p>Thank you for your interest in the ChittorTech QA Laboratory Management System for <strong>${safe.companyName} – ${safe.plantName}</strong>.</p>
       <p>After reviewing your submission, we are unable to approve this Account Request at this time. If you believe this was in error or would like to provide additional facility details, please contact our support team.</p>`;

  const plainText = isApproved
    ? `Dear ${input.fullName},\n\nYour Account Request (${input.requestId}) for ${input.companyName} – ${input.plantName} has been APPROVED.\n\nNext Steps: Your account access details will be shared with your registered work email, after which you can sign in at https://chittortech-laboratory-management-s.vercel.app\n${input.adminNotes ? `\nAdministrator Notes:\n${input.adminNotes}\n` : ''}\nOfficial Support: business@chittortech.in | contact@chittortech.in | +91 75974 51057`
    : `Dear ${input.fullName},\n\nThank you for your interest in ChittorTech QA Laboratory Management System (${input.companyName} – ${input.plantName}).\n\nAfter review, your Account Request (${input.requestId}) could not be approved at this time.\n${input.adminNotes ? `\nAdministrator Notes:\n${input.adminNotes}\n` : ''}\nOfficial Support: business@chittortech.in | contact@chittortech.in | +91 75974 51057`;

  try {
    await transporter.sendMail({
      from: `"ChittorTech QA LMS" <${senderEmail}>`,
      to: input.workEmail,
      subject,
      text: plainText,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 24px 12px; background-color: #f5f8fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
    <div style="background: ${headerBg}; padding: 20px 24px; border-bottom: 1px solid ${headerBorder};">
      <h2 style="margin: 0; color: ${titleColor}; font-size: 18px;">${heading}</h2>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">ChittorTech QA Laboratory Management System</p>
    </div>
    <div style="padding: 24px; font-size: 14px; line-height: 1.6; color: #334155;">
      <p style="margin-top: 0;">Dear <strong>${safe.fullName}</strong>,</p>
      ${bodyCopy}
      <div style="background: #f5f8fc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 13px;">
        <div><strong>Request Reference ID:</strong> <span style="font-family: monospace; font-weight: 700;">${safe.requestId}</span></div>
        <div><strong>Company / Plant:</strong> ${safe.companyName} – ${safe.plantName}</div>
        <div><strong>Status:</strong> <span style="display: inline-block; padding: 2px 8px; border-radius: 999px; background: ${badgeBg}; color: ${badgeText}; font-weight: 700; font-size: 11px; text-transform: uppercase;">${escapeHtml(input.status)}</span></div>
      </div>
      ${notesHtml}
      <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Official Support: business@chittortech.in | contact@chittortech.in | +91 75974 51057</p>
    </div>
  </div>
</body>
</html>`,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Account request status email error:', error?.message || error);
    return { success: false, error: error?.message || 'Status email delivery failed' };
  }
}

export interface DemoRequestEmailInput {
  demoRequestId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  companyName: string;
  plantName: string;
  designation?: string | null;
  city: string;
  state: string;
  message?: string | null;
  submittedAt: string;
}

/**
 * Sends Admin notification and User confirmation emails for a newly submitted Demo Request.
 */
export async function sendDemoRequestEmails(demo: DemoRequestEmailInput) {
  if (!isSmtpConfigured()) {
    return {
      success: false,
      adminSent: false,
      userSent: false,
      error: 'SMTP credentials not configured on server',
    };
  }

  if (!notificationEmail) {
    return {
      success: false,
      adminSent: false,
      userSent: false,
      error: 'Administrator notification email (NOTIFICATION_EMAIL) is not configured.',
    };
  }

  const transporter = createTransporter();
  const safe = {
    demoRequestId: escapeHtml(demo.demoRequestId),
    fullName: escapeHtml(demo.fullName),
    email: escapeHtml(demo.email),
    mobileNumber: escapeHtml(demo.mobileNumber),
    companyName: escapeHtml(demo.companyName),
    plantName: escapeHtml(demo.plantName),
    designation: escapeHtml(demo.designation || 'N/A'),
    city: escapeHtml(demo.city),
    state: escapeHtml(demo.state),
    message: escapeHtml(demo.message || 'None'),
    submittedAt: escapeHtml(demo.submittedAt),
  };

  const userPlainText = `Dear ${demo.fullName},

Thank you for your interest in ChittorTech DG Database / QA Laboratory Management System.

Your demo request has been successfully submitted to our administration team.

Our team will review your request and contact you regarding the demo schedule.

Your Demo Request ID: ${demo.demoRequestId}

Regards,
Team ChittorTech
business@chittortech.in
contact@chittortech.in
+91 75974 51057
https://chittortech.in`;

  const userHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 24px 12px; background-color: #f5f8fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
    <div style="background: #eaf3ff; padding: 20px 24px; border-bottom: 1px solid #d6e8ff;">
      <h2 style="margin: 0; color: #2563eb; font-size: 18px;">ChittorTech Demo Request Submitted</h2>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">ChittorTech DG Database • QA Laboratory Management System</p>
    </div>
    <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
      <p style="margin-top: 0;">Dear <strong>${safe.fullName}</strong>,</p>
      <p>Thank you for your interest in <strong>ChittorTech DG Database / QA Laboratory Management System</strong>.</p>
      <p>Your demo request has been successfully submitted to our administration team. Our team will review your request and contact you regarding the demo schedule.</p>
      <div style="background: #f5f8fc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 13px;">
        <div><strong>Your Demo Request ID:</strong> <span style="font-family: monospace; color: #2563eb; font-weight: 700;">${safe.demoRequestId}</span></div>
        <div><strong>Company / Plant:</strong> ${safe.companyName} – ${safe.plantName}</div>
        <div><strong>Current Status:</strong> Pending</div>
      </div>
      <p style="margin-bottom: 0; font-size: 13px;">
        Regards,<br/>
        <strong>Team ChittorTech</strong><br/>
        <a href="mailto:business@chittortech.in" style="color: #2563eb;">business@chittortech.in</a> |
        <a href="mailto:contact@chittortech.in" style="color: #2563eb;">contact@chittortech.in</a><br/>
        +91 75974 51057 | <a href="https://chittortech.in" style="color: #2563eb;">https://chittortech.in</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const adminPlainText = `NEW DEMO REQUEST RECEIVED — CHITTORTECH
Demo Request ID: ${demo.demoRequestId}
Status: Pending
Submitted At: ${demo.submittedAt}

Full Name: ${demo.fullName}
Email: ${demo.email}
Mobile Number: ${demo.mobileNumber}
Designation: ${demo.designation || 'N/A'}
Company / Organization: ${demo.companyName}
Plant Name: ${demo.plantName}
Location: ${demo.city}, ${demo.state}
Message: ${demo.message || 'None'}`;

  const adminHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 24px 12px; background-color: #f5f8fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
    <div style="background: #eaf3ff; padding: 20px 24px; border-bottom: 1px solid #d6e8ff;">
      <h2 style="margin: 0; color: #1e3a8a; font-size: 18px;">New Demo Request Received – ChittorTech</h2>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Demo Request ID: ${safe.demoRequestId} • ${safe.submittedAt}</p>
    </div>
    <div style="padding: 24px; font-size: 13px; line-height: 1.6;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #64748b; width: 160px;"><strong>Full Name</strong></td><td style="padding: 6px 0;">${safe.fullName}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;"><strong>Official Email</strong></td><td style="padding: 6px 0;"><a href="mailto:${safe.email}">${safe.email}</a></td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;"><strong>Mobile Number</strong></td><td style="padding: 6px 0;">${safe.mobileNumber}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;"><strong>Designation</strong></td><td style="padding: 6px 0;">${safe.designation}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;"><strong>Company</strong></td><td style="padding: 6px 0;">${safe.companyName}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;"><strong>Plant Name</strong></td><td style="padding: 6px 0;">${safe.plantName}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;"><strong>Location</strong></td><td style="padding: 6px 0;">${safe.city}, ${safe.state}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;"><strong>Status</strong></td><td style="padding: 6px 0;">Pending</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; vertical-align: top;"><strong>Message</strong></td><td style="padding: 6px 0;">${safe.message.replace(/\n/g, '<br/>')}</td></tr>
      </table>
    </div>
  </div>
</body>
</html>`;

  try {
    const [userRes, adminRes] = await Promise.allSettled([
      transporter.sendMail({
        from: `"ChittorTech QA LMS" <${senderEmail}>`,
        to: demo.email,
        subject: 'Your ChittorTech Demo Request Has Been Submitted',
        text: userPlainText,
        html: userHtml,
      }),
      transporter.sendMail({
        from: `"ChittorTech QA LMS" <${senderEmail}>`,
        to: notificationEmail,
        subject: 'New Demo Request Received – ChittorTech',
        text: adminPlainText,
        html: adminHtml,
      }),
    ]);

    const userSent = userRes.status === 'fulfilled';
    const adminSent = adminRes.status === 'fulfilled';
    const errors: string[] = [];
    if (userRes.status === 'rejected') {
      errors.push(`User email failed: ${userRes.reason?.message || 'Unknown error'}`);
    }
    if (adminRes.status === 'rejected') {
      errors.push(`Admin email failed: ${adminRes.reason?.message || 'Unknown error'}`);
    }
    if (errors.length > 0) {
      console.error('Demo request email error:', errors.join(' | '));
    }

    return {
      success: userSent && adminSent,
      userSent,
      adminSent,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  } catch (err: any) {
    console.error('Demo request SMTP exception:', err?.message || err);
    return {
      success: false,
      userSent: false,
      adminSent: false,
      error: err?.message || 'SMTP delivery failed',
    };
  }
}

export interface DemoRequestStatusEmailInput {
  demoRequestId: string;
  fullName: string;
  email: string;
  companyName: string;
  plantName: string;
  status: 'Contacted' | 'Demo Scheduled' | 'Demo Completed' | 'Cancelled';
  scheduledDemoDate?: string | null;
  scheduledDemoTime?: string | null;
  adminNotes?: string | null;
}

/**
 * Sends status update / Demo Scheduled email to the visitor when admin updates demo_requests in Supabase.
 */
export async function sendDemoRequestStatusEmail(input: DemoRequestStatusEmailInput) {
  if (!isSmtpConfigured()) {
    return { success: false, error: 'SMTP credentials not configured on server' };
  }

  const transporter = createTransporter();
  const safe = {
    demoRequestId: escapeHtml(input.demoRequestId),
    fullName: escapeHtml(input.fullName),
    companyName: escapeHtml(input.companyName),
    plantName: escapeHtml(input.plantName),
    status: escapeHtml(input.status),
    date: input.scheduledDemoDate ? escapeHtml(input.scheduledDemoDate) : '',
    time: input.scheduledDemoTime ? escapeHtml(input.scheduledDemoTime) : '',
    adminNotes: input.adminNotes ? escapeHtml(input.adminNotes) : '',
  };

  let subject = `[ChittorTech] Demo Request Update (${input.status})`;
  let heading = `Demo Request Status: ${input.status}`;
  let headerBg = '#eaf3ff';
  let headerBorder = '#d6e8ff';
  let titleColor = '#2563eb';
  let bodyHtml = '';
  let plainText = '';

  if (input.status === 'Demo Scheduled') {
    subject = 'Your ChittorTech Product Demo Has Been Scheduled';
    heading = 'Your Product Demo Has Been Scheduled';
    headerBg = '#dcfce7';
    headerBorder = '#bbf7d0';
    titleColor = '#15803d';
    bodyHtml = `
      <p>Good news! Your ChittorTech product demonstration has been scheduled.</p>
      <div style="background: #f5f8fc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 13px;">
        <div><strong>Demo Request ID:</strong> <span style="font-family: monospace; font-weight: 700;">${safe.demoRequestId}</span></div>
        <div><strong>Company / Plant:</strong> ${safe.companyName} – ${safe.plantName}</div>
        ${safe.date ? `<div><strong>Demo Date:</strong> ${safe.date}</div>` : ''}
        ${safe.time ? `<div><strong>Demo Time:</strong> ${safe.time}</div>` : ''}
      </div>
      <p>Our team looks forward to demonstrating the ChittorTech DG Database / QA Laboratory Management System to you.</p>
    `;
    plainText = `Dear ${input.fullName},\n\nGood news! Your ChittorTech product demonstration has been scheduled.\n\nDemo Request ID: ${input.demoRequestId}\n${input.scheduledDemoDate ? `Demo Date: ${input.scheduledDemoDate}\n` : ''}${input.scheduledDemoTime ? `Demo Time: ${input.scheduledDemoTime}\n` : ''}${input.adminNotes ? `\nInstructions / Notes:\n${input.adminNotes}\n` : ''}\nOur team looks forward to demonstrating the ChittorTech DG Database / QA Laboratory Management System to you.\n\nRegards,\nTeam ChittorTech`;
  } else {
    const statusMessages: Record<string, string> = {
      Contacted: 'Our team has reviewed your demo request and reached out to coordinate your demonstration schedule.',
      'Demo Completed': 'Thank you for attending the ChittorTech DG Database / QA Laboratory Management System demonstration. Please reply if you need pricing or onboarding details.',
      Cancelled: 'Your ChittorTech demo request has been marked as Cancelled. If you would like to reschedule, please contact our team anytime.',
    };
    const msg = statusMessages[input.status] || `Your demo request status has been updated to ${input.status}.`;
    bodyHtml = `
      <p>${escapeHtml(msg)}</p>
      <div style="background: #f5f8fc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 16px 0; font-size: 13px;">
        <div><strong>Demo Request ID:</strong> <span style="font-family: monospace; font-weight: 700;">${safe.demoRequestId}</span></div>
        <div><strong>Status:</strong> ${safe.status}</div>
      </div>
    `;
    plainText = `Dear ${input.fullName},\n\n${msg}\n\nDemo Request ID: ${input.demoRequestId}\nStatus: ${input.status}\n${input.adminNotes ? `\nNotes:\n${input.adminNotes}\n` : ''}\nRegards,\nTeam ChittorTech`;
  }

  const notesBlock = safe.adminNotes
    ? `<div style="background: #ffffff; border-left: 3px solid ${titleColor}; padding: 12px 14px; margin: 16px 0; border-radius: 4px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
         <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Admin Message / Instructions</div>
         <div style="font-size: 13px; color: #334155;">${safe.adminNotes.replace(/\n/g, '<br/>')}</div>
       </div>`
    : '';

  try {
    await transporter.sendMail({
      from: `"ChittorTech QA LMS" <${senderEmail}>`,
      to: input.email,
      subject,
      text: plainText,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 24px 12px; background-color: #f5f8fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
    <div style="background: ${headerBg}; padding: 20px 24px; border-bottom: 1px solid ${headerBorder};">
      <h2 style="margin: 0; color: ${titleColor}; font-size: 18px;">${escapeHtml(heading)}</h2>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">ChittorTech DG Database • QA Laboratory Management System</p>
    </div>
    <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
      <p style="margin-top: 0;">Dear <strong>${safe.fullName}</strong>,</p>
      ${bodyHtml}
      ${notesBlock}
      <p style="margin-bottom: 0; font-size: 13px;">
        Regards,<br/>
        <strong>Team ChittorTech</strong><br/>
        <a href="mailto:business@chittortech.in" style="color: #2563eb;">business@chittortech.in</a> |
        <a href="mailto:contact@chittortech.in" style="color: #2563eb;">contact@chittortech.in</a> | +91 75974 51057
      </p>
    </div>
  </div>
</body>
</html>`,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Demo status email error:', error?.message || error);
    return { success: false, error: error?.message || 'Status email delivery failed' };
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
