const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');

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
    const quizAttempts = await QuizAttempt.find({ userId: req.user.id })
      .populate({
        path: 'quizId',
        select: 'title subject duration',
        options: { lean: true }
      })
      .lean()
      .sort({ completedAt: -1 });

    // Calculate additional fields for each attempt
    const formattedAttempts = quizAttempts.map(attempt => ({
      _id: attempt._id,
      userId: attempt.userId,
      quizId: {
        _id: attempt.quizId._id,
        title: attempt.quizId.title || 'Untitled Quiz',
        subject: attempt.quizId.subject || 'General',
        duration: attempt.quizId.duration || 0
      },
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: Math.round((attempt.score / attempt.totalMarks) * 100),
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
