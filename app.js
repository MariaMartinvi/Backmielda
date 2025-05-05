const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('./config/passport');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const googleAuthRoutes = require('./routes/auth');
const stripeRoutes = require('./routes/stripeRoutes');
const storyRoutes = require('./routes/storyRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://micuentacuentos.com', 'https://*.render.com']
    : process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuración de sesión
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Debug middleware para ver las rutas registradas
app.use((req, res, next) => {
  console.log('Request URL:', req.url);
  next();
});

// Routes
app.use('/api/auth', googleAuthRoutes); // Rutas de Google primero
app.use('/api/auth', authRoutes);       // Otras rutas de autenticación después

// Resto de rutas
app.use('/api/stripe', stripeRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cuentos-db')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5001;

// Start server
if (process.env.NODE_ENV === 'production') {
  // In production, we're behind Nginx which handles SSL
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} else {
  // In development, we can use HTTP
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app; 