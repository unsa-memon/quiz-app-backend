const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

// @desc    Get all users with their quizzes and attempts 
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    // 1. Get all users with minimal fields
    const users = await User.find({})
      .select('_id name email role isActive createdAt updatedAt')
      .lean();

    // 2. Get all quizzes with creator information
    const allQuizzes = await Quiz.find({})
      .populate('createdBy', 'name email')
      .lean();
    
    console.log('All quizzes:', allQuizzes.map(q => ({
      _id: q._id,
      title: q.title,
      createdBy: q.createdBy ? q.createdBy._id : 'no creator'
    })));

    // Group quizzes by creator
    const quizzesByUser = allQuizzes.reduce((acc, quiz) => {
      const creatorId = quiz.createdBy ? quiz.createdBy._id.toString() : 'unassigned';
      
      if (!acc[creatorId]) {
        acc[creatorId] = [];
      }
      
      // Include all quiz fields
      acc[creatorId].push({
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description || '',
        questions: quiz.questions || [],
        isPublished: !!quiz.isPublished,
        category: quiz.category || 'General',
        difficulty: quiz.difficulty || 'Medium',
        timeLimit: quiz.timeLimit || 0,
        passingScore: quiz.passingScore || 0,
        tags: quiz.tags || [],
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt,
        createdBy: quiz.createdBy ? {
          _id: quiz.createdBy._id,
          name: quiz.createdBy.name,
          email: quiz.createdBy.email
        } : null
      });
      
      return acc;
    }, {});

    // 3. Count quiz attempts by user
    const attemptsByUser = await QuizAttempt.aggregate([
      { $match: {} },
      { $group: {
          _id: '$user',
          count: { $sum: 1 }
      }}
    ]);
    
    // Convert to a map for easy lookup
    const attemptCounts = attemptsByUser.reduce((acc, {_id, count}) => {
      if (_id) acc[_id.toString()] = count;
      return acc;
    }, {});

    // 4. Format the response with user data and their quizzes
    const formattedUsers = users.map(user => {
      const userId = user._id.toString();
      const userQuizzes = quizzesByUser[userId] || [];
      
      return {
        ...user,
        quizCount: userQuizzes.length,
        quizzes: userQuizzes,
        totalAttempts: attemptCounts[userId] || 0
      };
    });

    // 5. Include unassigned quizzes in the response
    const unassignedQuizzes = quizzesByUser['unassigned'] || [];
    const responseData = {
      success: true,
      count: formattedUsers.length,
      users: formattedUsers,
      unassignedQuizzes: unassignedQuizzes
    };

    console.log('Response data:', JSON.stringify({
      userCount: formattedUsers.length,
      unassignedQuizCount: unassignedQuizzes.length,
      sampleUser: formattedUsers[0] ? {
        name: formattedUsers[0].name,
        quizCount: formattedUsers[0].quizCount,
        quizzes: formattedUsers[0].quizzes.map(q => q.title)
      } : 'No users'
    }, null, 2));

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    next(error);
  }
};

// @desc    Delete user and all their data
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User not found with id of ${req.params.id}`
      });
    }

    // Delete all quizzes created by this user
    const deletedQuizzes = await Quiz.deleteMany({ createdBy: user._id });
    
    // Delete all quiz attempts by this user
    const deletedAttempts = await QuizAttempt.deleteMany({ user: user._id });
    
    // Delete the user
    await user.deleteOne();
    
    console.log(`Deleted user ${user._id}:`, {
      quizzesDeleted: deletedQuizzes.deletedCount,
      attemptsDeleted: deletedAttempts.deletedCount
    });

    res.status(200).json({
      success: true,
      data: {},
      message: 'User and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    next(error);
  }
};

// @desc    Delete a quiz and all its attempts
// @route   DELETE /api/admin/quizzes/:id
// @access  Private/Admin
exports.deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: `Quiz not found with id of ${req.params.id}`
      });
    }

    // Delete all attempts for this quiz
    await QuizAttempt.deleteMany({ quiz: quiz._id });
    
    // Delete the quiz
    await quiz.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Quiz and all associated attempts deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteQuiz:', error);
    next(error);
  }
};

// @desc    Get quiz statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getStats = async (req, res, next) => {
  try {
    const [
      userCount,
      quizCount,
      attemptCount,
      users,
      quizzes,
      recentAttempts
    ] = await Promise.all([
      User.countDocuments({}),
      Quiz.countDocuments({}),
      QuizAttempt.countDocuments({}),
      User.find({}).select('name email role createdAt').sort({ createdAt: -1 }).limit(5),
      Quiz.find({}).select('title owner createdAt')
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .limit(5),
      QuizAttempt.find({})
        .populate('user', 'name email')
        .populate('quiz', 'title')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('user quiz score totalQuestions percentage createdAt')
    ]);

    res.status(200).json({
      success: true,
      data: {
        counts: {
          users: userCount,
          quizzes: quizCount,
          attempts: attemptCount
        },
        recentUsers: users,
        recentQuizzes: quizzes,
        recentAttempts
      }
    });
  } catch (error) {
    console.error('Error in getStats:', error);
    next(error);
  }
};
