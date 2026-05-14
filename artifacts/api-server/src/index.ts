import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { getMongoClient, getDatabase, closeMongoClient } from './db/connection';
import authRouter from './routes/auth';
import auditLogsRouter from './routes/auditLogsRoutes';
import profilesRouter from './routes/profiles';
import { initAuditLogs } from './db/auditLogs';
import { seedTestData } from './db/seed';
import { authMiddleware, staffOnlyMiddleware } from './middleware/auth';
import { initStaffCollection } from './db/staff';
import staffRoutes from './routes/staffRoutes';
import cloudinaryRoutes from './routes/cloudinaryRoutes';
import crypto from 'crypto';
 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================================================
// MIDDLEWARE - MUST BE FIRST!
// ============================================================================

// CORS
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5175',
      'http://localhost:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:5000',
      'https://nikah-network.pk',
      'https://intikhab-e-zauj.onrender.com',
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON & URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// API Routes - NOW AFTER MIDDLEWARE
// ============================================================================

// Health Check
// ============================================================================
// API Routes - NOW AFTER MIDDLEWARE
// ============================================================================

// Health Check
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
// Auth routes (NO middleware needed for login)
app.use('/auth', authRouter);
// Cloudinary routes (NO middleware needed)
app.use('/api/cloudinary', cloudinaryRoutes);

// Initialize audit logs collection (once)
let auditLogsInitialized = false;
app.use(async (req, res, next) => {
  if (!auditLogsInitialized) {
    try {
      const db = await getDatabase();
      await initAuditLogs(db);
      auditLogsInitialized = true;
      console.log('✓ Audit logs collection initialized');
    } catch (error) {
      console.error('Failed to initialize audit logs:', error);
    }
  }
  next();
});

// Staff API routes (with auth middleware for protected endpoints)
app.use('/api/staff', staffRoutes);
app.use('/api/staff/profiles', authMiddleware, staffOnlyMiddleware, profilesRouter);
app.use('/api/staff', authMiddleware, staffOnlyMiddleware, auditLogsRouter);



// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    message: 'Intikhab-e-Zauj API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/auth/login',
      profiles: '/api/staff/profiles/:id/approve',
      auditLogs: '/api/staff/audit-logs',
      staffManagement: '/api/staff/invite',
    },
  });
});

// ... rest of index.ts

// ============================================================================
// Server Startup
// ============================================================================

const PORT = parseInt(process.env.BACKEND_PORT || '5000', 10);
const HOST = '0.0.0.0';

async function startServer() {
  try {
    console.log('🔄 Testing database connection...');
    const db = await getDatabase();
    await db.admin().ping();
    console.log('✓ Database connection verified');
    
    await seedTestData(db);

    console.log('🔄 Initializing audit logs...');
    await initAuditLogs(db);
    console.log('✓ Audit logs initialized');

    console.log('🔄 Initializing staff collection...');
    await initStaffCollection(db);
    console.log('✓ Staff collection initialized');

    const server = app.listen(PORT, HOST, () => {
      console.log(`\n✓ Server running on http://${HOST}:${PORT}`);
      console.log(`✓ Frontend: http://localhost:${PORT}/`);
      console.log(`✓ API Info: http://localhost:${PORT}/api/info`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
      console.log(`✓ Login: http://localhost:${PORT}/staff-login`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
    });

    const handleShutdown = async (signal: string) => {
      console.log(`\n📍 Received ${signal}, shutting down gracefully...`);
      
      server.close(async () => {
        await closeMongoClient();
        console.log('✓ Server closed');
        process.exit(0);
      });

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

