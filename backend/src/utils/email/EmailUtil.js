const nodemailer = require('nodemailer');

class EmailUtil {
  static createTransporter() {
    const port = Number(process.env.SMTP_PORT) || 587;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true' || port === 465,
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  static async sendOtp(toEmail, otp) {
    return this.#send({
      to: toEmail,
      subject: 'AI-LMS email verification code',
      text: `Your AI-LMS verification code is ${otp}. The code expires in ${process.env.OTP_EXPIRE_MINUTES || 5} minutes.`,
      html: this.#buildOtpHtml(otp),
    });
  }

  static async #send({ to, subject, text, html }) {
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    if (!fromEmail) throw new Error('SMTP_FROM_EMAIL or SMTP_USER is required.');
    const fromName = process.env.SMTP_FROM_NAME || 'AI-LMS';
    return this.createTransporter().sendMail({ from: `"${fromName}" <${fromEmail}>`, to, subject, text, html });
  }

  static #buildOtpHtml(otp) {
    return this.#card(
      'AI-LMS email verification',
      `Your verification code is:<div style="font-size:30px;font-weight:700;letter-spacing:8px;margin:18px 0">${this.#escape(otp)}</div>`
      + `This code expires in ${process.env.OTP_EXPIRE_MINUTES || 5} minutes.`,
    );
  }

  static #card(title, body) {
    return `<div style="font-family:Arial,sans-serif;background:#f6f8fb;padding:32px">`
      + `<div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:28px">`
      + `<div style="font-size:14px;font-weight:700;color:#1f3b64;margin-bottom:16px">AI-LMS</div>`
      + `<h2 style="margin:0 0 14px;color:#111827">${title}</h2>`
      + `<div style="color:#4b5563;line-height:1.6">${body}</div>`
      + `</div></div>`;
  }

  static #escape(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[char]);
  }
}

module.exports = EmailUtil;
