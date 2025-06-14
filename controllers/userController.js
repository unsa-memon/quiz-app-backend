const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const mongoose = require('mongoose');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if new email already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user quiz history
// @route   GET /api/users/history
// @access  Private
exports.getUserHistory = async (req, res) => {
  try {
    // First, get the quiz attempts with basic quiz info
    const quizAttempts = await QuizAttempt.find({ user: req.user.id })
      .populate({
        path: 'quiz',
        select: 'title subject duration',
        options: { lean: true }
      })
      .lean()
      .sort({ completedAt: -1 });

    // Calculate additional fields for each attempt
    const formattedAttempts = quizAttempts.map(attempt => ({
      _id: attempt._id,
      userId: attempt.user,
      quizId: attempt.quiz ? {
        _id: attempt.quiz._id,
        title: attempt.quiz.title || 'Untitled Quiz',
        subject: attempt.quiz.subject || 'General',
        duration: attempt.quiz.duration || 0
      } : null,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.totalMarks > 0 ? Math.round((attempt.score / attempt.totalMarks) * 100) : 0,
      responses: attempt.responses || [],
      completedAt: attempt.completedAt,
      timeTaken: attempt.timeTaken
    }));

    res.status(200).json({
      success: true,
      count: formattedAttempts.length,
      data: formattedAttempts
    });
  } catch (error) {
    console.error('Error in getUserHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving quiz history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's created quizzes
// @route   GET /api/users/quizzes
// @access  Private
exports.getUserQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's average score across all quizzes
// @route   GET /api/users/average-score
// @access  Private
exports.getUserAverageScore = async (req, res) => {
  try {
    // First, get all unique quiz IDs from user's attempts
    const attempts = await QuizAttempt.find({ user: req.user.id }).lean();

    if (attempts.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          averageScore: 0,
          totalAttempts: 0,
          totalScore: 0,
          totalPossibleMarks: 0,
          averagePercentage: 0,
          message: 'No quiz attempts found for this user'
        }
      });
    }

    // Calculate total score from all attempts
    const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
    
    // Get all unique quiz IDs
    const quizIds = [...new Set(attempts.map(attempt => attempt.quiz.toString()))];
    
    // Get all quizzes with their questions
    const quizzes = await Quiz.find({ _id: { $in: quizIds } })
      .populate('questions', 'marks')
      .lean();
    
    // Create a map of quizId to total possible marks
    const quizMarksMap = {};
    quizzes.forEach(quiz => {
      if (quiz.questions && quiz.questions.length > 0) {
        quizMarksMap[quiz._id.toString()] = quiz.questions.reduce(
          (sum, q) => sum + (q.marks || 1), 0
        );
      } else {
        quizMarksMap[quiz._id.toString()] = 0;
      }
    });
    
    // Calculate total possible marks based on the quizzes the user has taken
    let totalPossibleMarks = 0;
    attempts.forEach(attempt => {
      const quizId = attempt.quiz.toString();
      totalPossibleMarks += quizMarksMap[quizId] || 0;
    });
    
    const averageScore = attempts.length > 0 ? totalScore / attempts.length : 0;
    const averagePercentage = totalPossibleMarks > 0 ? (totalScore / totalPossibleMarks) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        averageScore: parseFloat(averageScore.toFixed(2)),
        averagePercentage: parseFloat(averagePercentage.toFixed(2)),
        totalAttempts: attempts.length,
        totalScore: parseFloat(totalScore.toFixed(2)),
        totalPossibleMarks: parseFloat(totalPossibleMarks.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error in getUserAverageScore:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating average score',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's performance analytics
// @route   GET /api/users/analytics
// @access  Private
exports.getUserAnalytics = async (req, res) => {
  try {
    const quizAttempts = await QuizAttempt.find({ userId: req.user.id })
      .populate({
        path: 'quizId',
        select: 'title subject'
      })
      .lean(); // Convert to plain JavaScript objects to include virtuals

    // Calculate percentage for each attempt
    quizAttempts.forEach(attempt => {
      attempt.percentage = (attempt.score / attempt.totalMarks) * 100;
    });

    // Get total quizzes attempted
    const totalAttempts = quizAttempts.length;

    // Get average score
    const totalScore = quizAttempts.reduce((acc, attempt) => {
      return acc + attempt.percentage;
    }, 0);
    const averageScore = totalAttempts > 0 ? (totalScore / totalAttempts).toFixed(2) : 0;

    // Get subject-wise performance
    const subjectPerformance = {};
    quizAttempts.forEach(attempt => {
      const subject = attempt.quizId.subject;
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = {
          attempts: 0,
          totalScore: 0
        };
      }
      subjectPerformance[subject].attempts += 1;
      subjectPerformance[subject].totalScore += attempt.percentage;
    });

    // Calculate average score for each subject
    Object.keys(subjectPerformance).forEach(subject => {
      const { attempts, totalScore } = subjectPerformance[subject];
      subjectPerformance[subject].averageScore = (totalScore / attempts).toFixed(2);
    });

    // Get recent activity (last 5 attempts)
    const recentActivity = quizAttempts
      .slice(0, 5)
      .map(attempt => ({
        quizId: attempt.quizId._id,
        title: attempt.quizId.title,
        subject: attempt.quizId.subject,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        completedAt: attempt.completedAt
      }));

    res.status(200).json({
      success: true,
      data: {
        totalAttempts,
        averageScore,
        subjectPerformance,
        recentActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
