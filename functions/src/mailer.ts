import nodemailer from 'nodemailer';
import type { ComposedContactEmail } from './contact-validation.js';

export interface MailerConfig {
  readonly mailbox: string;
  readonly smtpPassword: string;
}

export interface ContactMailer {
  send(email: ComposedContactEmail): Promise<void>;
}

export function createNodemailerMailer(config: MailerConfig): ContactMailer {
  const mailbox = config.mailbox.trim();
  const smtpPassword = config.smtpPassword.trim();

  if (!mailbox || !smtpPassword) {
    throw new Error('Contact mailer credentials are not configured');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: mailbox,
      pass: smtpPassword,
    },
  });

  return {
    async send(email: ComposedContactEmail): Promise<void> {
      await transporter.sendMail({
        from: email.from,
        to: email.to,
        replyTo: email.replyTo,
        subject: email.subject,
        text: email.text,
      });
    },
  };
}
