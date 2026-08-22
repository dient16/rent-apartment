import to from 'await-to-js';
import nodemailer from 'nodemailer';

import { env } from '@/config/env.config';

const { EMAIL_NAME, EMAIL_APP_PASSWORD } = env;

interface SendMailOptions {
  email: string;
  html: string;
  subject: string;
}

/** Shared transporter for the whole app — not recreated per email. */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_NAME,
    pass: EMAIL_APP_PASSWORD,
  },
});

export const sendMail = async ({ email, html, subject }: SendMailOptions): Promise<nodemailer.SentMessageInfo> => {
  const [error, info] = await to(
    transporter.sendMail({
      from: '"Rent Apartment" <no-reply@rentapartment.com>',
      to: email,
      subject,
      html,
    })
  );

  if (error) {
    throw error;
  }

  return info;
};
