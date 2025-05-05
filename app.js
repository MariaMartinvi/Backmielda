const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('./config/passport');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const googleAuthRoutes = require('./routes/auth');
const stripeRoutes = require('./routes/stripeRoutes');
const storyRoutes = require('./routes/storyRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Configuración de sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
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
  res.status(500).json({ message: 'Something went wrong!' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cuentos-db')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 