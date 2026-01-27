/**
 * Hetzner Validation Server
 * Provides SSE endpoint for real-time credential validation
 * Runs on port 3001 (configurable via PORT env var)
 */

const express = require('express');
const cors = require('cors');
const { validateCredentialsWithProgress } = require('./lib/validate-credentials');

const app = express();

// Enable CORS for Vercel frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Allow large certificate files

/**
 * SSE endpoint for credential validation
 * POST /validate-credentials
 *
 * Body: { email, password, keyFileBase64, cerFileBase64 }
 * Response: Server-Sent Events stream with progress updates
 */
app.post('/validate-credentials', async (req, res) => {
  const { email, password, keyFileBase64, cerFileBase64 } = req.body;

  // Validate required fields
  if (!email || !password || !keyFileBase64 || !cerFileBase64) {
    return res.status(400).json({
      error: 'Faltan parámetros requeridos'
    });
  }

  console.log(`[Validation] Starting validation for ${email}`);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Progress callback - sends SSE messages
  const onProgress = (message) => {
    console.log(`[Validation] Progress: ${message}`);
    res.write(`data: ${JSON.stringify({ message })}\n\n`);
  };

  try {
    const result = await validateCredentialsWithProgress({
      email,
      password,
      keyFileBase64,
      cerFileBase64,
      onProgress
    });

    console.log(`[Validation] Result:`, result);

    // Send final result
    res.write(`data: ${JSON.stringify({
      ...result,
      done: true
    })}\n\n`);
    res.end();
  } catch (error) {
    console.error(`[Validation] Error:`, error);
    res.write(`data: ${JSON.stringify({
      success: false,
      error: error.message || 'Error desconocido',
      done: true
    })}\n\n`);
    res.end();
  }
});

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hetzner-validation-server',
    timestamp: new Date().toISOString()
  });
});

/**
 * Root endpoint info
 * GET /
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Hetzner Tribunal Electrónico Validation Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      validate: 'POST /validate-credentials'
    }
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Hetzner validation server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Validation: POST http://localhost:${PORT}/validate-credentials`);
});

// Handle cleanup errors from puppeteer plugins without crashing
process.on('unhandledRejection', (reason, promise) => {
  // Log the error but don't crash - puppeteer cleanup errors are non-critical
  if (reason && reason.code === 'ENOTEMPTY') {
    console.warn('[Server] Puppeteer cleanup warning (non-critical):', reason.message);
  } else {
    console.error('[Server] Unhandled rejection:', reason);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
