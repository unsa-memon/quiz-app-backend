const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quizzes');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Connect to MongoDB
const connectDB = require('./config/db');
connectDB();

// Debug middleware for all routes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
console.log('Mounting routes...');
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Debug route to list all routes
console.log('Available routes:');
console.log('GET /api/quizzes/attempt/:attemptId/results - Get quiz attempt by ID');
console.log('ADMIN ROUTES:');
console.log('GET    /api/admin/stats - Get admin dashboard statistics');
console.log('GET    /api/admin/users - Get all users with their quizzes and attempts');
console.log('DELETE /api/admin/users/:id - Delete a user and all their data');
console.log('DELETE /api/admin/quizzes/:id - Delete a quiz and all its attempts');

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Log error for debugging
  console.error('Error:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    status: statusCode,
    message: err.message,
    stack: err.stack
  });

  // Format error response
  const errorResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred. Please try again later.' 
      : err.message,
    errors: err.details || []
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'build', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});