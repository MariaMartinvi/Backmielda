// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('rate-limiter-flexible');

// Load environment variables once
require('dotenv').config({ path: __dirname + '/.env' });

// Set environment to development
process.env.NODE_ENV = 'development';

// Create Express app
const app = express();

// Log API key configurations
console.log("OpenAI API Key configurada:", !!process.env.OPENAI_API_KEY);
console.log("Google TTS API Key configurada:", !!process.env.GOOGLE_TTS_API_KEY);

// Security middleware
app.use(helmet({
  // Disable contentSecurityPolicy in development if needed
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// CORS configuration - unified in one place
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5001', 'https://cuentacuentosfront.onrender.com', 'https://www.micuentacuentos.com'];

console.log("Allowed origins:", allowedOrigins);

// CORS middleware
app.use(cors({
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Rate limiting
const apiLimiter = new rateLimit.RateLimiterMemory({
  points: 10, // Number of requests
  duration: 60, // Per minute
});

app.use(async (req, res, next) => {
  try {
    await apiLimiter.consume(req.ip);
    next();
  } catch (error) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
});

// Simple health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Import route handlers
const storyRoutes = require('./routes/storyRoutes');
const audioRoutes = require('./routes/audioRoutes');

// Apply routes
app.use('/api/stories', storyRoutes);
app.use('/api/audio', audioRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'An internal server error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});