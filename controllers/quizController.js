const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Get all quizzes
// @route   GET /api/quizzes
// @access  Public
exports.getQuizzes = async (req, res) => {
  try {
    console.log('Fetching quizzes with params:', req.query);
    
    const { subject, sort, search } = req.query;
    
    // Validate sort parameter
    const validSortOptions = ['a-z', 'z-a', 'newest', 'oldest', 'duration-asc', 'duration-desc'];
    if (sort && !validSortOptions.includes(sort.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid sort option. Valid options are: ${validSortOptions.join(', ')}`
      });
    }

    // Build query
    const query = { isPublic: true };
    
    // Filter by subject
    if (subject && subject !== 'all') {
      query.subject = subject;
    }
    
    // Search by title
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    
    // Build sort object
    let sortOptions = {};
    if (sort) {
      const lowerSort = sort.toLowerCase();
      switch (lowerSort) {
        case 'a-z':
          sortOptions.title = 1;
          break;
        case 'z-a':
          sortOptions.title = -1;
          break;
        case 'newest':
          sortOptions.createdAt = -1;
          break;
        case 'oldest':
          sortOptions.createdAt = 1;
          break;
        case 'duration-asc':
          sortOptions.duration = 1;
          break;
        case 'duration-desc':
          sortOptions.duration = -1;
          break;
        default:
          sortOptions.createdAt = -1;
      }
    } else {
      sortOptions.createdAt = -1; // Default sort by newest
    }

    console.log('Query:', query);
    console.log('Sort options:', sortOptions);

    const quizzes = await Quiz.find(query)
      .select('title subject duration createdAt questions')
      .populate('createdBy', 'name')
      .sort(sortOptions);

    console.log(`Found ${quizzes.length} quizzes`);

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameter format'
      });
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Server error occurred. Please try again later.'
    });
  }
};

// @desc    Get single quiz
// @route   GET /api/quizzes/:id
// @access  Public
exports.getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('createdBy', 'name');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new quiz
// @route   POST /api/quizzes/create
// @access  Private
exports.createQuiz = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add user to req.body
    req.body.createdBy = req.user.id;

    // Validate quiz data
    const { title, subject, duration, questions } = req.body;
    if (!title || !subject || !duration || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, subject, duration, and at least one question'
      });
    }

    // Create quiz
    const quiz = await Quiz.create(req.body);

    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Server error occurred. Please try again later.'
    });
  }
};

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private
exports.updateQuiz = async (req, res) => {
  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Make sure user is quiz owner
    if (quiz.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this quiz'
      });
    }

    quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Make sure user is quiz owner
    if (quiz.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this quiz'
      });
    }

    // Also delete all attempts for this quiz
    await QuizAttempt.deleteMany({ quizId: quiz._id });
    
    await quiz.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Submit quiz attempt
// @route   POST /api/quizzes/:id/attempt
// @access  Public
exports.submitQuizAttempt = async (req, res) => {
  console.log('\n===== QUIZ ATTEMPT SUBMISSION STARTED =====');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request URL:', req.originalUrl);
  console.log('Request Method:', req.method);
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Request Params:', JSON.stringify(req.params, null, 2));
  console.log('User:', req.user || 'No user authenticated');
  console.log('=========================================\n');


  try {
    const { id: quizId } = req.params;
    const { responses, timeTaken } = req.body;

     // Add more detailed logging for the incoming data
     console.log('\n===== PROCESSING QUIZ ATTEMPT =====');
     console.log(`Quiz ID: ${quizId}`);
     console.log(`Time Taken: ${timeTaken} seconds`);
     console.log(`Number of responses: ${responses ? responses.length : 0}`);
      
     if (responses && Array.isArray(responses)) {
      console.log('\n===== RESPONSES RECEIVED =====');
      responses.forEach((response, index) => {
        console.log(`\nResponse ${index + 1}:`);
        console.log(`- Question ID: ${response.questionId}`);
        console.log(`- Selected Answer:`, response.selectedAnswer);
        console.log(`- Type of selectedAnswer:`, typeof response.selectedAnswer);
      });
      console.log('==============================\n');
    }

    // Basic validation
    if (!quizId) {
      console.log('Error: No quiz ID provided');
      return res.status(400).json({
        success: false,
        message: 'Quiz ID is required'
      });
    }

    if (!responses || !Array.isArray(responses)) {
      console.log('Error: Invalid or missing responses array');
      return res.status(400).json({
        success: false,
        message: 'Valid responses array is required'
      });
    }

    console.log(`Processing quiz ${quizId} with ${responses.length} responses`);

    // Get the quiz
    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) {
      console.log(`Error: Quiz ${quizId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    console.log(`Found quiz: ${quiz.title} with ${quiz.questions.length} questions`);

    // Process responses
    let score = 0;
    // Fixed answer checking logic for your current data format
    // Fixed answer checking logic for your current data format
const processedResponses = responses.map((response, index) => {
  console.log(`Processing response ${index + 1}/${responses.length}`, response);
  
  const question = quiz.questions.find(q => q._id.toString() === response.questionId);
  if (!question) {
    console.log(`Question ${response.questionId} not found in quiz`);
    return null;
  }

  const userAnswer = response.selectedAnswer;
  let isCorrect = false;

  console.log(`Question type: ${question.type}`);
  console.log(`Correct answer: ${question.correctAnswer} (type: ${typeof question.correctAnswer})`);
  console.log(`User answer: ${userAnswer} (type: ${typeof userAnswer})`);

  // Handle different question types
  switch (question.type) {
    case 'MCQ':
      // For MCQ, compare the selected index directly
      isCorrect = parseInt(question.correctAnswer) === parseInt(userAnswer);
      console.log(`MCQ comparison: ${question.correctAnswer} === ${userAnswer} = ${isCorrect}`);
      break;
      
    case 'Fill':
      // For fill-in-the-blank, do case-insensitive comparison
      if (!question.correctAnswer || userAnswer === null || userAnswer === undefined) {
        isCorrect = false;
      } else {
        const correctStr = question.correctAnswer.toString().toLowerCase().trim();
        const userStr = userAnswer.toString().toLowerCase().trim();
        isCorrect = correctStr === userStr;
        console.log(`Fill comparison: "${correctStr}" === "${userStr}" = ${isCorrect}`);
      }
      break;
      
    default:
      console.log('Unknown question type:', question.type);
      isCorrect = false;
  }

  if (isCorrect) {
    score += question.marks || 1;
    console.log(`✓ Correct! Added ${question.marks || 1} marks. Total score: ${score}`);
  } else {
    console.log(`✗ Incorrect. Score remains: ${score}`);
  }

  return {
    questionId: response.questionId,
    selectedAnswer: userAnswer,
    isCorrect,
    questionType: question.type,
    correctAnswer: question.correctAnswer
  };
}).filter(Boolean);

    console.log(`Quiz processed. Score: ${score}/${quiz.questions.length}`);

    // Create attempt data
    const attemptData = {
      quiz: quizId,  // Changed from quizId to quiz to match schema
      user: req.user?.id || new mongoose.Types.ObjectId(),  // Changed from userId to user to match schema
      score,
      totalMarks: quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
      totalQuestions: quiz.questions.length,  // Added missing required field
      responses: processedResponses,
      timeTaken: timeTaken || 0,
      completedAt: new Date()
    };

    console.log('Attempt data prepared:', JSON.stringify(attemptData, null, 2));

    // Save the attempt
    const quizAttempt = await QuizAttempt.create(attemptData);
    console.log('Quiz attempt saved successfully:', quizAttempt._id);

    res.status(201).json({
      success: true,
      data: {
        ...quizAttempt.toObject(),
        percentage: Math.round((score / attemptData.totalMarks) * 100)
      }
    });

  } catch (error) {
    console.error('!!! CRITICAL ERROR in submitQuizAttempt !!!');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request details:', {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      body: req.body,
      user: req.user || 'No user'
    });

    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz attempt',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  } finally {
    console.log('=== End of quiz submission ===');
  }
};

// @desc    Get all subjects (categories)
// @route   GET /api/quizzes/subjects
// @access  Public
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Quiz.distinct('subject');

    res.status(200).json({
      success: true,
      data: subjects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get quiz attempt by ID
// @route   GET /api/quizzes/attempt/:attemptId/results
// @access  Public
exports.getQuizAttemptById = async (req, res) => {
  console.log('getQuizAttemptById called with params:', req.params);
  console.log('Full URL:', req.originalUrl);
  try {
    const { attemptId } = req.params;

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attempt ID format'
      });
    }

    // Find the attempt and populate the quiz details
    const attempt = await QuizAttempt.findById(attemptId)
      .populate({
        path: 'quiz',
        select: 'title subject description questions',
        populate: {
          path: 'questions',
          select: 'questionText options type marks correctAnswer'
        }
      })
      .lean();

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found'
      });
    }

    // Calculate total possible score by summing marks of all questions
    const totalPossibleScore = attempt.quiz.questions.reduce(
      (sum, question) => sum + (question.marks || 0), 0
    );
    
    // Calculate percentage based on score and total possible score
    let calculatedPercentage = 0;
    if (totalPossibleScore > 0) {
      calculatedPercentage = Math.round((attempt.score / totalPossibleScore) * 100);
    }
    
    // Ensure the percentage is a valid number
    calculatedPercentage = isNaN(calculatedPercentage) ? 0 : calculatedPercentage;
    
    // Update the attempt with the new percentage
    attempt.percentage = calculatedPercentage;
    
    // Save the updated percentage to the database
    try {
      await QuizAttempt.findByIdAndUpdate(attempt._id, { 
        $set: { 
          percentage: calculatedPercentage,
          totalMarks: totalPossibleScore // Ensure totalMarks is up to date
        } 
      });
    } catch (updateError) {
      console.error('Error updating attempt percentage:', updateError);
      // Continue with the request even if update fails
    }

    // Map through responses and add question details
    const enhancedResponses = attempt.responses.map(response => {
      const question = attempt.quiz.questions.find(
        q => q._id.toString() === response.questionId.toString()
      );
      
      return {
        ...response,
        questionText: question?.questionText || 'Question not found',
        questionType: question?.type,
        options: question?.options || [],
        correctAnswer: question?.correctAnswer,
        marks: question?.marks || 1
      };
    });

    // Prepare the response data
    const responseData = {
      _id: attempt._id,
      quizId: attempt.quiz._id,
      quizTitle: attempt.quiz.title,
      subject: attempt.quiz.subject,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      totalPossibleScore: totalPossibleScore, // Using the already calculated totalPossibleScore
      percentage: attempt.percentage,
      timeTaken: attempt.timeTaken,
      completedAt: attempt.completedAt,
      responses: enhancedResponses
    };
    
    // Log the response data for debugging
    console.log('Sending response data:', JSON.stringify(responseData, null, 2));

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching quiz attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz attempt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
