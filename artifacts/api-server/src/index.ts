import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { getMongoClient, getDatabase, closeMongoClient } from './db/connection';
import authRouter from './routes/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================================================
// Middleware
// ============================================================================

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://nikah-network.pk', 'https://intikhab-e-zauj.onrender.com']
    : ['http://localhost:5173', 'http://localhost:5000'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// API Routes
// ============================================================================

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    const db = await getDatabase();
    await db.admin().ping();
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Auth routes
app.use('/auth', authRouter);

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    message: 'Intikhab-e-Zauj API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/auth/login',
    },
  });
});

// ============================================================================
// Serve Frontend (Static Files) - SPA Configuration
// ============================================================================

// Path to built frontend
const frontendPath = path.join(__dirname, '../../nikah-network/dist');

// Serve static files (JS, CSS, images, etc.)
app.use(express.static(frontendPath, {
  maxAge: '1h', // Cache static assets for 1 hour
}));

// SPA fallback: serve index.html for all non-API routes using middleware
app.use((req, res, next) => {
  // Skip API and auth routes
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/health')) {
    return next();
  }

  const indexPath = path.join(frontendPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err.message);
      res.status(404).json({
        error: 'Frontend not found',
        message: 'The frontend build is missing. Please run: pnpm run build',
      });
    }
  });
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = parseInt(process.env.BACKEND_PORT || '5000', 10);
const HOST = '0.0.0.0';

async function startServer() {
  try {
    // Test database connection on startup
    console.log('🔄 Testing database connection...');
    const db = await getDatabase();
    await db.admin().ping();
    console.log('✓ Database connection verified');

    const server = app.listen(PORT, HOST, () => {
      console.log(`\n✓ Server running on http://${HOST}:${PORT}`);
      console.log(`✓ Frontend: http://localhost:${PORT}/`);
      console.log(`✓ API Info: http://localhost:${PORT}/api/info`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
      console.log(`✓ Login: http://localhost:${PORT}/staff-login`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n📁 Serving frontend from: ${frontendPath}`);
      }
      console.log('');
    });

    // Graceful Shutdown
    const handleShutdown = async (signal: string) => {
      console.log(`\n📍 Received ${signal}, shutting down gracefully...`);
      
      server.close(async () => {
        await closeMongoClient();
        console.log('✓ Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('✗ Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;