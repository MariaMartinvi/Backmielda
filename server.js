// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('rate-limiter-flexible');
const dotenv = require('dotenv');

// Load environment variables
require('dotenv').config({ path: __dirname + '/.env' });

// Al principio de server.js
// Configure CORS - with fallback for missing env var

app.options('*', cors()); // Handle preflight requests for all routes


console.log("Google TTS API Key configurada:", !!process.env.GOOGLE_TTS_API_KEY);
// Create Express app - THIS WAS MISSING
const app = express();

console.log("OpenAI API Key configurada:", !!process.env.OPENAI_API_KEY);
console.log("Google TTS API Key configurada:", !!process.env.GOOGLE_TTS_API_KEY);

// Security middleware
app.use(helmet({
  // Disable contentSecurityPolicy in development if needed
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));



// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'https://cuentacuentosfront.onrender.com'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow requests with no origin (e.g., mobile apps)
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS error: Origin ${origin} not allowed`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'], // Allow these HTTP methods
  credentials: true, // Allow cookies and credentials
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers
}));

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

// Handle OPTIONS requests
app.options('*', cors());

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