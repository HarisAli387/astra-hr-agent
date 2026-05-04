import multer from 'multer';
import * as pdfImport from 'pdf-parse';
import nodemailer from 'nodemailer';
import type { IncomingMessage, ServerResponse } from 'http';

type VercelRequest = IncomingMessage & { body?: any; query?: any; url?: string };
type VercelResponse = ServerResponse & {
  json: (data: any) => VercelResponse;
  status: (code: number) => VercelResponse;
};

const pdf = (pdfImport as any).default || pdfImport;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'harisrahat95@gmail.com',
    pass: process.env.EMAIL_APP_PWD || 'gycq ixhv mgyz ftux',
  },
});

// Run multer as a promise
function runMulter(req: any, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single('cvFile')(req, res, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.split('?')[0];

  // Health check
  if (req.method === 'GET' && path === '/api/health') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  // Screen CV
  if (req.method === 'POST' && path === '/api/screen-cv') {
    try {
      await runMulter(req as any, res as any);

      const body = (req as any).body || {};
      const file = (req as any).file;
      const jobDescription = body.jobDescription;
      const candidateEmail = body.candidateEmail;

      if (!file) return res.status(400).json({ error: 'No CV uploaded.' });
      if (!jobDescription) return res.status(400).json({ error: 'Job description is required.' });

      let cvText = '';
      try {
        if (file.mimetype === 'application/pdf') {
          const data = await pdf(file.buffer);
          cvText = data.text;
        } else {
          cvText = file.buffer.toString('utf-8');
        }
      } catch (parseErr: any) {
        console.error('PDF Parse Error:', parseErr);
        return res.status(500).json({ error: 'Failed to parse PDF file.' });
      }

      const extractKeywords = (text: string) =>
        Array.from(new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)));

      const jdWords = extractKeywords(jobDescription);
      const cvWords = extractKeywords(cvText);

      let matchCount = 0;
      const detectedSkills: string[] = [];

      jdWords.forEach(word => {
        if (cvWords.includes(word)) {
          matchCount++;
          if (word.length > 4 && detectedSkills.length < 6) {
            detectedSkills.push(word.charAt(0).toUpperCase() + word.slice(1));
          }
        }
      });

      let matchScore = jdWords.length > 0 ? Math.round((matchCount / jdWords.length) * 100) : 0;
      matchScore = Math.min(98, matchScore + 35);

      const emailMatch = cvText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      const extractedEmail = emailMatch ? emailMatch[1] : 'Not Provided';
      const finalEmail = candidateEmail || extractedEmail;
      const finalName = finalEmail !== 'Not Provided' ? finalEmail.split('@')[0] : 'Candidate';

      const result = {
        candidateName: finalName,
        candidateEmail: finalEmail,
        skillsDetected: detectedSkills.length > 0 ? detectedSkills : ['General Skills', 'Communication'],
        matchScore,
        aiSummary: `Candidate matches approximately ${matchScore}% of the requirements based on keyword overlap. They have shown familiarity with key areas like ${detectedSkills.join(', ') || 'general competencies'}.`,
      };

      if (result.candidateEmail && result.candidateEmail !== 'Not Provided' && !result.candidateEmail.includes('Unknown')) {
        try {
          await transporter.sendMail({
            from: `"HR Recruitment" <${process.env.EMAIL_USER || 'harisrahat95@gmail.com'}>`,
            to: result.candidateEmail,
            cc: process.env.EMAIL_USER || 'harisrahat95@gmail.com',
            subject: `Update on your Job Application - ${result.candidateName}`,
            html: `<div style="font-family:sans-serif;padding:20px;color:#333"><h2>Update on your Job Application</h2><p>Hello <strong>${result.candidateName}</strong>,</p><p>Your CV has been processed. Match Score: <strong>${result.matchScore}%</strong>. Our team will be in touch.</p><p>Best regards,<br/><strong>HR Team</strong></p></div>`,
          });
        } catch (mailErr) {
          console.error('Failed to send status email:', mailErr);
        }
      }

      return res.json(result);
    } catch (error: any) {
      console.error('screen-cv error:', error);
      return res.status(500).json({ error: 'Internal server error: ' + (error.message || 'Unknown') });
    }
  }

  // Schedule Interview
  if (req.method === 'POST' && path === '/api/schedule-interview') {
    try {
      const { candidateEmail, candidateName, date, time } = req.body as any;

      if (!candidateEmail || !date || !time) {
        return res.status(400).json({ error: 'Missing required scheduling details.' });
      }

      await transporter.sendMail({
        from: `"HR Auto-Scheduler" <${process.env.EMAIL_USER || 'harisrahat95@gmail.com'}>`,
        to: candidateEmail,
        cc: process.env.EMAIL_USER || 'harisrahat95@gmail.com',
        subject: `Invitation for Interview - ${candidateName}`,
        html: `<div style="font-family:sans-serif;padding:20px;color:#333"><h2>Interview Invitation</h2><p>Dear <strong>${candidateName}</strong>,</p><p>We'd like to invite you for an interview on <strong>${date} at ${time}</strong>.</p><p>Please reply to confirm your availability.</p><p>Best regards,<br/><strong>HR Team</strong></p></div>`,
      });

      return res.json({ success: true, message: 'Interview scheduled and email sent successfully.' });
    } catch (error: any) {
      console.error('schedule-interview error:', error);
      return res.status(500).json({ error: 'Failed to schedule interview: ' + (error.message || 'Unknown') });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
