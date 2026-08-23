import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../config/logger';

export interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

type EmailData = Record<string, any>;

function createTransporter(): Transporter | null {
  try {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
      logger.warn('Email configuration missing - emails will be logged only');
      return null;
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false }, // Allow self-signed certs in dev
    });
  } catch (err: any) {
    logger.error('Failed to create email transporter', { error: err.message });
    return null;
  }
}

const transporter = createTransporter();

const FROM = process.env.EMAIL_FROM || 'HealthCare App <noreply@healthcare.dev>';

const baseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f4f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1d4ed8,#0d9488);padding:32px;text-align:center;">
            <div style="color:#fff;font-size:24px;font-weight:700;">🏥 HealthCare App</div>
            <div style="color:#e0f2fe;font-size:13px;margin-top:4px;">Your Health, Our Priority</div>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">
              This is an automated message from HealthCare App.<br/>
              <strong>AI-generated content is for informational purposes only and is not a medical diagnosis.</strong><br/>
              Always consult your healthcare provider for medical advice.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

const appointmentInfoBlock = (doctor: string, date: string, time: string, specialization?: string) => `
<div style="background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;padding:20px;margin:16px 0;">
  <table width="100%">
    <tr>
      <td><strong style="color:#64748b;">Doctor</strong></td>
      <td style="color:#0f172a;">Dr. ${doctor}${specialization ? ` · ${specialization}` : ''}</td>
    </tr>
    <tr>
      <td><strong style="color:#64748b;">Date</strong></td>
      <td style="color:#0f172a;">${date}</td>
    </tr>
    <tr>
      <td><strong style="color:#64748b;">Time</strong></td>
      <td style="color:#0f172a;">${time}</td>
    </tr>
  </table>
</div>
`;

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  // In development with no real email config, log it
  if (!transporter) {
    logger.info(`[EMAIL SIMULATION] To: ${to} | Subject: ${subject}`);
    logger.debug('[EMAIL SIMULATION] HTML content generated (not displayed for brevity)');
    return { success: true, messageId: `simulated-${Date.now()}` };
  }

  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, html });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    logger.error(`Email send failed to ${to}`, { error: err.message });
    return { success: false, error: err.message };
  }
}

export const emailService = {
  async sendBookingConfirmation(data: {
    to: string; patientName: string; doctorName: string;
    appointmentDate: string; startTime: string; endTime?: string;
    appointmentId: string; doctorSpecialization?: string;
  }): Promise<EmailResult> {
    const html = baseTemplate(`
      <h2 style="color:#0f172a;margin:0 0 8px;">✅ Appointment Confirmed</h2>
      <p style="color:#64748b;">Hi ${data.patientName}, your appointment has been successfully booked.</p>
      ${appointmentInfoBlock(data.doctorName, data.appointmentDate, data.startTime, data.doctorSpecialization)}
      <p style="color:#64748b;font-size:13px;">Appointment ID: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${data.appointmentId}</code></p>
      <p style="color:#64748b;">You'll receive a reminder before your appointment. Please arrive 10 minutes early.</p>
    `, 'Appointment Confirmation');
    return sendEmail(data.to, `Appointment Confirmed - Dr. ${data.doctorName}`, html);
  },

  async sendNewBookingToDoctor(data: {
    to: string; doctorName: string; patientName: string;
    appointmentDate: string; startTime: string; endTime?: string; appointmentId: string;
  }): Promise<EmailResult> {
    const html = baseTemplate(`
      <h2 style="color:#0f172a;margin:0 0 8px;">📅 New Appointment Booked</h2>
      <p>Hi Dr. ${data.doctorName},</p>
      <p style="color:#64748b;">A new appointment has been scheduled with <strong>${data.patientName}</strong>.</p>
      ${appointmentInfoBlock(data.doctorName, data.appointmentDate, data.startTime)}
      <p style="color:#64748b;font-size:13px;">Appointment ID: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${data.appointmentId}</code></p>
    `, 'New Appointment');
    return sendEmail(data.to, `New Appointment: ${data.patientName} on ${data.appointmentDate}`, html);
  },

  async sendAppointmentReminder(data: {
    to: string; patientName: string; doctorName: string;
    appointmentDate: string; startTime: string;
  }): Promise<EmailResult> {
    const html = baseTemplate(`
      <h2 style="color:#0f172a;margin:0 0 8px;">⏰ Appointment Reminder</h2>
      <p>Hi ${data.patientName},</p>
      <p style="color:#64748b;">This is a reminder about your upcoming appointment.</p>
      ${appointmentInfoBlock(data.doctorName, data.appointmentDate, data.startTime)}
      <p style="color:#64748b;">Please remember to bring any relevant medical records or medications.</p>
    `, 'Appointment Reminder');
    return sendEmail(data.to, `Reminder: Appointment Tomorrow with Dr. ${data.doctorName}`, html);
  },

  async sendCancellationNotification(data: {
    to: string; patientName: string; doctorName: string;
    appointmentDate: string; startTime: string; cancelReason?: string;
  }): Promise<EmailResult> {
    const html = baseTemplate(`
      <h2 style="color:#dc2626;margin:0 0 8px;">❌ Appointment Cancelled</h2>
      <p>Hi ${data.patientName},</p>
      <p style="color:#64748b;">Your appointment has been cancelled.</p>
      ${appointmentInfoBlock(data.doctorName, data.appointmentDate, data.startTime)}
      ${data.cancelReason ? `<p style="color:#64748b;"><strong>Reason:</strong> ${data.cancelReason}</p>` : ''}
      <p style="color:#64748b;">You can book a new appointment at any time through the app.</p>
    `, 'Appointment Cancelled');
    return sendEmail(data.to, `Appointment Cancelled - Dr. ${data.doctorName}`, html);
  },

  async sendRescheduleNotification(data: {
    to: string; patientName: string; doctorName: string;
    oldDate: string; oldTime: string; newDate: string; newTime: string;
  }): Promise<EmailResult> {
    const html = baseTemplate(`
      <h2 style="color:#0f172a;margin:0 0 8px;">🔄 Appointment Rescheduled</h2>
      <p>Hi ${data.patientName},</p>
      <p style="color:#64748b;">Your appointment has been rescheduled.</p>
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin:12px 0;">
        <strong>Previous:</strong> ${data.oldDate} at ${data.oldTime}
      </div>
      <div style="background:#d1fae5;border-left:4px solid #10b981;border-radius:8px;padding:16px;margin:12px 0;">
        <strong>New:</strong> ${data.newDate} at ${data.newTime}
      </div>
      <p style="color:#64748b;">Doctor: <strong>Dr. ${data.doctorName}</strong></p>
    `, 'Appointment Rescheduled');
    return sendEmail(data.to, `Appointment Rescheduled - Dr. ${data.doctorName}`, html);
  },

  async sendDoctorLeaveNotification(data: {
    to: string; patientName: string; doctorName: string;
    appointmentDate: string; startTime: string;
  }): Promise<EmailResult> {
    const html = baseTemplate(`
      <h2 style="color:#dc2626;margin:0 0 8px;">⚠️ Doctor Unavailable - Appointment Cancelled</h2>
      <p>Hi ${data.patientName},</p>
      <p style="color:#64748b;">We regret to inform you that Dr. ${data.doctorName} is unavailable on ${data.appointmentDate}. Your appointment has been cancelled.</p>
      ${appointmentInfoBlock(data.doctorName, data.appointmentDate, data.startTime)}
      <p style="color:#64748b;">We apologize for the inconvenience. You can book with another available doctor through the app.</p>
    `, 'Doctor Unavailable');
    return sendEmail(data.to, `Appointment Cancelled - Doctor Unavailable on ${data.appointmentDate}`, html);
  },

  async sendMedicationReminder(data: {
    to: string; patientName: string; medicationName: string; dose?: string;
  }): Promise<EmailResult> {
    const html = baseTemplate(`
      <h2 style="color:#0f172a;margin:0 0 8px;">💊 Medication Reminder</h2>
      <p>Hi ${data.patientName},</p>
      <p style="color:#64748b;">This is a reminder to take your medication.</p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:20px;margin:16px 0;">
        <strong style="font-size:18px;">💊 ${data.medicationName}</strong>
        ${data.dose ? `<br/><span style="color:#64748b;">Time: ${data.dose}</span>` : ''}
      </div>
      <p style="color:#94a3b8;font-size:12px;">Always follow your doctor's prescribed dosage and instructions.</p>
    `, 'Medication Reminder');
    return sendEmail(data.to, `Medication Reminder: ${data.medicationName}`, html);
  },

  async sendNotificationEmail(notification: any): Promise<EmailResult> {
    const meta = notification.metadata as any || {};
    const appt = notification.appointment;
    const user = notification.user;

    switch (notification.type) {
      case 'BOOKING_CONFIRMATION':
        return this.sendBookingConfirmation({
          to: user.email,
          patientName: meta.patientName || user.name,
          doctorName: meta.doctorName || (appt?.doctor?.name ?? 'your doctor'),
          appointmentDate: meta.appointmentDate || '',
          startTime: meta.startTime || '',
          appointmentId: notification.appointmentId || '',
          doctorSpecialization: meta.doctorSpecialization,
        });
      case 'CANCELLATION':
        return this.sendCancellationNotification({
          to: user.email,
          patientName: user.name,
          doctorName: meta.doctorName || '',
          appointmentDate: meta.appointmentDate || '',
          startTime: meta.startTime || '',
          cancelReason: meta.cancelReason,
        });
      case 'DOCTOR_LEAVE':
        return this.sendDoctorLeaveNotification({
          to: user.email,
          patientName: user.name,
          doctorName: meta.doctorName || '',
          appointmentDate: meta.appointmentDate || '',
          startTime: meta.startTime || '',
        });
      default:
        logger.warn(`No email template for notification type: ${notification.type}`);
        return { success: false, error: `No template for ${notification.type}` };
    }
  },
};