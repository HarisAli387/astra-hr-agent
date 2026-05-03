import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
import nodemailer from 'nodemailer';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini
const ai = new GoogleGenAI({ 
  // User provided key fallback if environment variable is not present
  apiKey: process.env.GEMINI_API_KEY || "AIzaSyBCG6256SVF4z4XzWcz7g_xzCIeu-itdqg" 
});

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 5000;

  app.use(express.json());

  // Set up Nodemailer with the user's provided app password
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'harisrahat95@gmail.com',
      pass: process.env.EMAIL_APP_PWD || 'ngkj ynkv wogi cymz'
    }
  });

  // API endpoint for CV scoring
  app.post('/api/screen-cv', upload.single('cvFile'), async (req, res) => {
    try {
      const { jobDescription } = req.body;
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
        // Assume text file
        cvText = file.buffer.toString('utf-8');
      }

      console.log('Extracting and scoring with Gemini...');

      const prompt = `
      You are an expert HR AI assistant. 
      Analyze the following candidate's CV against the provided Job Description.
      
      Job Description:
      ${jobDescription}

      CV Details:
      ${cvText}

      Extract the following information and output ONLY valid JSON without markdown wrapping:
      {
        "candidateName": "Extracted name (or 'Unknown')",
        "candidateEmail": "Extracted email (or 'Not Provided')",
        "skillsDetected": ["Skill 1", "Skill 2"],
        "matchScore": 85, // An integer from 0 to 100 based on how well the CV matches the JD
        "aiSummary": "A 2-3 sentence explanation of the match score and candidate fit."
      }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
      });

      const responseText = response.text || '';
      // Parse JSON from text, accommodating possible markdown tags
      let jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      let result;
      try {
        result = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Gemini non-JSON output:", responseText);
        return res.status(500).json({ error: 'Failed to parse AI response' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error during screen-cv API:', error);
      res.status(500).json({ error: 'Internal server error while processing CV.' });
    }
  });

  // API endpoint for scheduling an interview
  app.post('/api/schedule-interview', async (req, res) => {
    try {
      const { candidateEmail, candidateName, date, time } = req.body;

      if (!candidateEmail || !date || !time) {
        return res.status(400).json({ error: 'Missing required scheduling details.' });
      }

      const mailOptions = {
        from: '"HR Auto-Scheduler" <harisrahat95@gmail.com>',
        to: candidateEmail,
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
    } catch (error) {
      console.error('Error scheduling interview:', error);
      res.status(500).json({ error: 'Failed to schedule interview.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
