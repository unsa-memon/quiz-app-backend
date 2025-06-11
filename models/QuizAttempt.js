const mongoose = require('mongoose');

const QuizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  responses: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    selectedAnswer: {
      type: mongoose.Schema.Types.Mixed
    },
    isCorrect: {
      type: Boolean,
      required: true,
      default: false
    }
  }],
  completedAt: {
    type: Date,
    default: Date.now
  },
  timeTaken: {
    type: Number, // in seconds
    default: 0
  },
  // Adding these fields for better querying in admin panel
  username: String,
  quizTitle: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save hook to calculate percentage and set additional fields
QuizAttemptSchema.pre('save', async function(next) {
  try {
    // Calculate percentage
    if (this.totalQuestions > 0) {
      this.percentage = Math.round((this.score / this.totalQuestions) * 100);
    }
    
    // Populate username and quizTitle if not set
    if (!this.username || !this.quizTitle) {
      const [user, quiz] = await Promise.all([
        this.populate('user', 'name email'),
        this.populate('quiz', 'title')
      ]);
      
      if (user && user.user) {
        this.username = user.user.name || user.user.email;
      }
      
      if (quiz && quiz.quiz) {
        this.quizTitle = quiz.quiz.title;
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in QuizAttempt pre-save hook:', error);
    next(error);
  }
});

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);