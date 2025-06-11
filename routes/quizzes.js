const express = require('express');
const router = express.Router();

// Debug middleware to log all incoming requests
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});
const {
  getQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuizAttempt,
  getSubjects,
  getQuizAttemptById
} = require('../controllers/quizController');
const { protect } = require('../middleware/auth');

// Debug route to check if router is working
router.get('/test-route', (req, res) => {
  console.log('Test route hit!');
  res.json({ success: true, message: 'Test route is working!' });
});

// Public routes
router.get('/', getQuizzes);
router.get('/subjects', getSubjects);

// Specific route for quiz attempt results - must come before :id route
router.get('/attempt/:attemptId/results', getQuizAttemptById);

// Catch-all for other quiz ID routes - must be last
router.get('/:id', getQuiz);

// Protected routes
router.post('/create', protect, createQuiz);
router.put('/:id', protect, updateQuiz);
router.delete('/:id', protect, deleteQuiz);
router.post('/:id/attempt', protect, submitQuizAttempt);

module.exports = router;