import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { requireAuthenticatedSession } from '@/lib/auth/session';

const smtpHost = process.env.SMTP_HOST || 'smtpout.secureserver.net';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpUser = process.env.SMTP_USER || 'contact@chittortech.in';
const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';
const senderEmail = process.env.SENDER_EMAIL || process.env.SMTP_FROM || 'contact@chittortech.in';

export async function POST(request: Request) {
  try {
    const auth = requireAuthenticatedSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const {
      recipientEmail,
      subject = 'ChittorTech QA Laboratory — Chemical Analysis Report',
      message = '',
      pdfBase64,
      reportPeriod = 'Current Period',
      recordCount = 0,
      plantName = 'ChittorTech QA Laboratory',
    } = body;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail.trim())) {
      return NextResponse.json({ success: false, error: 'Valid recipient email address is required' }, { status: 400 });
    }

    if (!pdfBase64) {
      return NextResponse.json({ success: false, error: 'PDF report attachment data missing' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #0f172a; padding: 22px 28px;">
      <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
        OFFICIAL LABORATORY DISPATCH
      </div>
      <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">
        ChittorTech QA Laboratory Management System
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">
        Chemical Analysis & Quality Control Report
      </p>
    </div>

    <div style="padding: 26px 28px; color: #334155; line-height: 1.6;">
      <p style="margin-top: 0; font-size: 14px;">Hello,</p>
      <p style="font-size: 14px;">
        Please find attached the official <strong>ChittorTech QA Laboratory Chemical Analysis Report</strong> for <strong>${plantName}</strong>.
      </p>

      <div style="margin: 18px 0; padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;">
        <div style="margin-bottom: 4px;"><strong>Reporting Period:</strong> ${reportPeriod}</div>
        <div style="margin-bottom: 4px;"><strong>Total Logged Samples:</strong> ${recordCount} records</div>
        <div><strong>Parameters Evaluated:</strong> LOI, IR, SO₃, CaO, SiO₂, Al₂O₃, Fe₂O₃, MgO, Cl⁻</div>
      </div>

      ${
        message
          ? `<div style="margin: 18px 0; padding: 12px 14px; background-color: #eff6ff; border-left: 3px solid #2563eb; border-radius: 4px; font-size: 13px; color: #1e3a8a;">
              <strong>Sender Note:</strong><br/>${message.replace(/\n/g, '<br/>')}
            </div>`
          : ''
      }

      <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
        The complete detailed report with date-wise chemical oxide breakdowns has been attached to this email as a PDF document (<code>ChittorTech_QA_Report.pdf</code>).
      </p>
    </div>

    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
      © ${new Date().getFullYear()} ChittorTech. Industrial Quality Assurance & Materials Testing Suite. Confidential.
    </div>
  </div>
</body>
</html>`;

    // Clean base64 string
    const base64Data = pdfBase64.replace(/^data:application\/pdf;filename=generated\.pdf;base64,/, '').replace(/^data:application\/pdf;base64,/, '');

    const mailOptions = {
      from: `"ChittorTech QA Reports" <${senderEmail}>`,
      to: recipientEmail.trim(),
      subject: subject.trim() || 'ChittorTech QA Laboratory — Chemical Analysis Report',
      text: `Hello,\n\nPlease find attached the official ChittorTech QA Laboratory Chemical Analysis Report for ${plantName}.\n\nReporting Period: ${reportPeriod}\nTotal Samples: ${recordCount}\n\n${message ? `Note: ${message}\n\n` : ''}© ChittorTech QA Laboratory Management System`,
      html: htmlContent,
      attachments: [
        {
          filename: `ChittorTech_QA_Report_${reportPeriod.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          content: Buffer.from(base64Data, 'base64'),
          contentType: 'application/pdf',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Report email dispatched:', info.messageId);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: `Report successfully dispatched to ${recipientEmail.trim()}`,
    });
  } catch (err: any) {
    console.error('Email report dispatch error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to dispatch report email' }, { status: 500 });
  }
}

