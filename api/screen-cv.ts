import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { api: { bodyParser: true, sizeLimit: '5mb' } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobDescription, candidateEmail, cvText: rawCvText } = req.body as any;

    if (!rawCvText) return res.status(400).json({ error: 'No CV text provided.' });
    if (!jobDescription) return res.status(400).json({ error: 'Job description is required.' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured.' });

    const prompt = `You are an expert HR recruiter. Analyze this CV against the job description and respond ONLY with valid JSON, no markdown, no explanation.

Job Description:
${jobDescription}

CV Text:
${rawCvText}

Respond with exactly this JSON structure:
{
  "candidateName": "extracted full name or 'Unknown Candidate'",
  "candidateEmail": "extracted email or 'Not Provided'",
  "skillsDetected": ["skill1", "skill2", "skill3"],
  "matchScore": 75,
  "aiSummary": "2-3 sentence professional summary of fit"
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', errText);
      return res.status(500).json({ error: 'AI analysis failed.' });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code fences if present
    const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonText);

    // Override email if user provided one
    if (candidateEmail) result.candidateEmail = candidateEmail;

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('screen-cv error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
