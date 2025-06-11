const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile, 
  getUserHistory,
  getUserQuizzes,
  getUserAnalytics
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// Quiz history routes
router.get('/history', getUserHistory);
router.get('/quizzes', getUserQuizzes);
router.get('/analytics', getUserAnalytics);

module.exports = router;
