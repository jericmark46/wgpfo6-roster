import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();

const clientOrigins = [
  'http://localhost:5173',
  'https://wgpfo6-roster.vercel.app',
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: clientOrigins,
    methods: ['GET', 'POST'],
  }),
);
app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  if (req.originalUrl.includes('ccbf-iloilo.vercel.app')) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    return res.json({ status: 'ok', db: 'ok' });
  } catch (error) {
    return res.status(503).json({ status: 'degraded', db: error.name || 'Connection failed' });
  }
});

app.use('/api', async (req, res, next) => {
  if (req.path === '/auth/verify') return next();
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/api', apiRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong.' });
});

export default app;
