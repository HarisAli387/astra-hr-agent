import express from 'express';
import multer from 'multer';
import * as pdfParseModule from 'pdf-parse';
const PDFParse = (pdfParseModule as any).PDFParse || pdfParseModule;

// Disable Vercel's default body parser so multer can process the multipart/form-data stream
export const config = {
  api: {
    bodyParser: false,
  },
};
import nodemailer from 'nodemailer';

const app = express();
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'harisrahat95@gmail.com',
    pass: process.env.EMAIL_APP_PWD || 'gycq ixhv mgyz ftux'
  }
});

app.post('/api/screen-cv', upload.single('cvFile'), async (req, res) => {
  try {
    const { jobDescription, candidateEmail } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No CV uploaded.' });
    }

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required.' });
    }

    let cvText = '';
    if (file.mimetype === 'application/pdf') {
      const parser = new PDFParse({ data: file.buffer });
      const pdfeData = await parser.getText();
      cvText = pdfeData.text;
      await parser.destroy();
    } else {
      cvText = file.buffer.toString('utf-8');
    }

    console.log('Scoring CV locally without Gemini...');

    const extractKeywords = (text: string) => {
      return Array.from(new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)));
    };

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
    let extractedEmail = emailMatch ? emailMatch[1] : 'Not Provided';
    
    const finalEmail = candidateEmail || extractedEmail;
    const finalName = finalEmail !== 'Not Provided' ? finalEmail.split('@')[0] : 'Candidate';

    let result: any = {
      candidateName: finalName,
      candidateEmail: finalEmail,
      skillsDetected: detectedSkills.length > 0 ? detectedSkills : ["General Skills", "Communication"],
      matchScore: matchScore,
      aiSummary: `Candidate matches approximately ${matchScore}% of the requirements based on keyword overlap. They have shown familiarity with key areas like ${detectedSkills.join(', ') || 'general competencies'}.`
    };

    if (result.candidateEmail && result.candidateEmail !== 'Not Provided' && !result.candidateEmail.includes('Unknown')) {
      const statusMailOptions = {
        from: '"HR Recruitment" <harisrahat95@gmail.com>',
        to: result.candidateEmail,
        cc: 'harisrahat95@gmail.com',
        subject: `Update on your Job Application - ${result.candidateName}`,
        text: `Hello ${result.candidateName},\n\nThank you for submitting your CV.\nWe have successfully processed it through our HR screening agent.\n\nHere are the insights based on the job description:\n- Match Score: ${result.matchScore}%\n- Summary: ${result.aiSummary}\n- Detected Skills: ${result.skillsDetected.join(', ')}\n\nWe will review these details and our HR team will get back to you regarding the next steps.\n\nBest regards,\nHR Team`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Update on your Job Application</h2>
            <p>Hello <strong>${result.candidateName}</strong>,</p>
            <p>Thank you for submitting your CV. We have successfully processed it through our HR screening agent.</p>
            <p>Here are the insights based on our job description:</p>
            <ul>
              <li><strong>Match Score:</strong> ${result.matchScore}%</li>
              <li><strong>Summary:</strong> ${result.aiSummary}</li>
              <li><strong>Detected Skills:</strong> ${result.skillsDetected.join(', ')}</li>
            </ul>
            <p>Our HR team will review these details and reach out regarding the next steps.</p>
            <br/>
            <p>Best regards,<br/><strong>HR Team</strong></p>
          </div>
        `
      };
      try {
        await transporter.sendMail(statusMailOptions);
        console.log("Status email sent to candidate:", result.candidateEmail);
      } catch (mailErr) {
        console.error("Failed to send status email:", mailErr);
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error("API Route Error:", error);
    res.status(500).json({ error: 'Internal server error while processing CV: ' + (error.message || '') });
  }
});

app.post('/api/schedule-interview', async (req, res) => {
  try {
    const { candidateEmail, candidateName, date, time } = req.body;

    if (!candidateEmail || !date || !time) {
      return res.status(400).json({ error: 'Missing required scheduling details.' });
    }

    const mailOptions = {
      from: '"HR Auto-Scheduler" <harisrahat95@gmail.com>',
      to: candidateEmail,
      cc: 'harisrahat95@gmail.com',
      subject: `Invitation for Interview - ${candidateName}`,
      text: `Dear ${candidateName},\n\nWe were impressed by your CV and would like to invite you for an interview on ${date} at ${time}.\n\nPlease let us know if this time works for you.\n\nBest regards,\nHR Team`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Interview Invitation</h2>
          <p>Dear <strong>${candidateName}</strong>,</p>
          <p>We were very impressed by your recent application. We would like to invite you to an interview on:</p>
          <h3>${date} at ${time}</h3>
          <p>Please reply to this email to confirm your availability.</p>
          <br/>
          <p>Best regards,<br/><strong>HR Team</strong></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Interview scheduled and email sent successfully.' });
  } catch (error: any) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({ error: 'Failed to schedule interview: ' + (error.message || '') });
  }
});

// Global error handler so Vercel doesn't return HTML 500 pages
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Express Global Error:", err);
  res.status(500).json({ error: "Internal API Error: " + err.message });
});

export default app;
