import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import testRoutes from './routes/tests.js';
import leaderboardRoutes from './routes/leaderboard.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CampusBit API is active', timestamp: new Date() });
});

// Setup routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Create HTTP Server
const server = http.createServer(app);

// Attach Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Save io reference globally to broadcast events from controllers
global.io = io;

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join a room for test-taking status if needed
  socket.on('join_test', (testId) => {
    socket.join(testId);
    console.log(`Socket ${socket.id} joined test room: ${testId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message || err);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`CampusBit server running on port ${PORT}`);
});
