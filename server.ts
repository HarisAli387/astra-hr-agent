import express from 'express';
import path from 'path';
import app from './api/index.ts';

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  // Use dynamic import to prevent Vite from crashing Vercel Serverless environment
  import('vite').then(async (viteModule) => {
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  // Start server if not running in Vercel Serverless
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Production server running on port ${PORT}`);
    });
  }
}
