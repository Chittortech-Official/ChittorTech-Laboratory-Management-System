import nodemailer from 'nodemailer';
import { AccountRequestPayload } from '@/types';

const smtpHost = process.env.SMTP_HOST || 'smtpout.secureserver.net';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpFrom = process.env.SMTP_FROM || 'business@chittortech.in';
const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'business@chittortech.in';

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
 * Sends notification email to ChittorTech admin and acknowledgment to applicant
 */
export async function sendAccountRequestEmails(payload: AccountRequestPayload) {
  if (!isSmtpConfigured()) {
    console.warn('SMTP not configured; skipping email dispatch.');
    return { success: false, error: 'SMTP credentials not configured' };
  }

  const transporter = createTransporter();

  // 1. Email to ChittorTech Admin
  const adminMailOptions = {
    from: `"ChittorTech QA LMS" <${smtpFrom}>`,
    to: adminEmail,
    subject: `🚨 [New Account Request] ${payload.companyName} — ${payload.plantName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 20px; text-align: left;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">ChittorTech QA Laboratory Management System</h2>
          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">New Industrial Account Access Request</p>
        </div>
        <div style="padding: 24px; color: #334155;">
          <p style="font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 0;">A new user has requested laboratory access:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; width: 35%;"><strong>Applicant Name:</strong></td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${payload.fullName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;"><strong>Work Email:</strong></td>
              <td style="padding: 10px 0; color: #2563eb; font-weight: 600;">${payload.workEmail}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;"><strong>Company / Enterprise:</strong></td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${payload.companyName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;"><strong>Plant / Facility:</strong></td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${payload.plantName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;"><strong>Designation / Role:</strong></td>
              <td style="padding: 10px 0; color: #0f172a;">${payload.designation}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;"><strong>Contact Number:</strong></td>
              <td style="padding: 10px 0; color: #0f172a;">${payload.phone}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;"><strong>Location:</strong></td>
              <td style="padding: 10px 0; color: #0f172a;">${payload.city}, ${payload.state}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #64748b; vertical-align: top;"><strong>Testing Scope / Reason:</strong></td>
              <td style="padding: 12px 0; color: #0f172a; line-height: 1.5;">${payload.reason}</td>
            </tr>
          </table>
          <div style="margin-top: 24px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; color: #475569;">
            This request has been automatically logged into Supabase table <code>account_requests</code> with status <strong>pending</strong>.
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} ChittorTech. Confidential QA Operations.
        </div>
      </div>
    `,
  };

  // 2. Acknowledgment Email to Applicant
  const applicantMailOptions = {
    from: `"ChittorTech QA LMS" <${smtpFrom}>`,
    to: payload.workEmail,
    subject: `Your Account Request for ChittorTech QA LMS has been received`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 20px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">ChittorTech QA Laboratory Management System</h2>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <p style="font-size: 15px; color: #0f172a;">Dear <strong>${payload.fullName}</strong>,</p>
          <p>Thank you for requesting access to the <strong>ChittorTech QA Laboratory Management System</strong> for <strong>${payload.companyName} (${payload.plantName})</strong>.</p>
          <p>Your request has been securely submitted to ChittorTech for verification. Once approved, your login account will be generated and official invitation details will be delivered to this email address.</p>
          <div style="margin: 20px 0; padding: 16px; background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 4px; font-size: 13px;">
            <strong>Request Status:</strong> Pending Verification<br/>
            <strong>Designation:</strong> ${payload.designation}<br/>
            <strong>Facility:</strong> ${payload.plantName}, ${payload.city}
          </div>
          <p style="font-size: 13px; color: #64748b;">If you have any questions, you can reach out directly to support at <a href="mailto:business@chittortech.in" style="color: #2563eb;">business@chittortech.in</a>.</p>
        </div>
        <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} ChittorTech. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    const [adminResult] = await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(applicantMailOptions).catch((err) => {
        console.warn('Failed to send applicant acknowledgment:', err.message);
      }),
    ]);
    return { success: true, messageId: adminResult.messageId };
  } catch (error: any) {
    console.error('SMTP send error:', error);
    return { success: false, error: error.message };
  }
}
