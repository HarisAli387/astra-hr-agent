import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { candidateEmail, candidateName, date, time } = req.body as any;

    if (!candidateEmail || !date || !time) {
      return res.status(400).json({ error: 'Missing required scheduling details.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PWD },
    });

    await transporter.sendMail({
      from: `"HR Auto-Scheduler" <${process.env.EMAIL_USER}>`,
      to: candidateEmail,
      subject: `Interview Invitation - ${candidateName}`,
      html: `<p>Dear <strong>${candidateName}</strong>, you are invited for an interview on <strong>${date} at ${time}</strong>. Please reply to confirm.</p>`,
    });

    return res.status(200).json({ success: true, message: 'Interview scheduled and email sent.' });
  } catch (error: any) {
    console.error('schedule-interview error:', error);
    return res.status(500).json({ error: error.message || 'Failed to schedule interview' });
  }
}
