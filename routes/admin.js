const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllUsers,
  deleteUser,
  deleteQuiz,
  getStats
} = require('../controllers/adminController');

// All routes below are protected and admin-only
router.use(protect);
router.use(authorize('admin'));

// Admin dashboard stats
router.get('/stats', getStats);

// User management
router.route('/users')
  .get(getAllUsers);

router.route('/users/:id')
  .delete(deleteUser);

// Quiz management
router.route('/quizzes/:id')
  .delete(deleteQuiz);

module.exports = router;
