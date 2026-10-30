import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ENV } from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { store, DB_MODE, getModeLabel } from './src/config/dbMode.js';
import { socketManager } from './src/sockets/socketManager.js';
import { setIO } from './src/sockets/broadcaster.js';

// Route imports
import authRoutes from './src/routes/authRoutes.js';
import busRoutes from './src/routes/busRoutes.js';
import routeRoutes from './src/routes/routeRoutes.js';
import stopRoutes from './src/routes/stopRoutes.js';
import driverRoutes from './src/routes/driverRoutes.js';
import tripRoutes from './src/routes/tripRoutes.js';
import alertRoutes from './src/routes/alertRoutes.js';
import analyticsRoutes from './src/routes/analyticsRoutes.js';

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.io with CORS
export const io = new Server(httpServer, {
  cors: {
    origin: [ENV.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Initialize Socket Manager
socketManager.initialize(io);
setIO(io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: [ENV.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'TransitIQ Pakistan Core Engine',
    timestamp: new Date().toISOString(),
  });
});

// Mount API Route Groups
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
    data: null,
    error: 'NOT_FOUND',
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    data: null,
    error: err.message,
  });
});

// Initialize database & server
const startServer = async () => {
  await connectDB();
  await store.initialize();

  const PORT = ENV.PORT;
  httpServer.listen(PORT, () => {
    console.log(`[TransitIQ] Server running on port ${PORT} in ${ENV.NODE_ENV} mode`);
    console.log(`[TransitIQ] DB_MODE=${DB_MODE} → active store: ${getModeLabel()}`);
    console.log(`[TransitIQ] Client allowed origin: ${ENV.CLIENT_ORIGIN}`);
    console.log(`[TransitIQ] Pakistan Transit System active`);
    console.log(`[TransitIQ] WebSocket Engine listening`);
  });
};

startServer();

export { app, httpServer };
