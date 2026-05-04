import express from 'express';
import path from 'path';
import app from './api/index.ts';

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  // Development mode with Vite HMR
  import('vite').then(async (viteModule) => {
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Development server running on http://localhost:${PORT}`);
    });
  });
} else {
  // Production mode
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    // If it's an API call that wasn't caught, return 404
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  // Only start listening if NOT on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Production server running on port ${PORT}`);
    });
  }
}
