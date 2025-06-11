const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a quiz title'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Please provide a subject'],
    trim: true
  },
  duration: {
    type: Number,
    required: [true, 'Please provide a duration in minutes'],
    min: [1, 'Duration must be at least 1 minute']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [{
    type: {
      type: String,
      enum: ['MCQ', 'Fill'],
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    options: {
      type: [String],
      required: function() {
        return this.type === 'MCQ';
      },
      validate: {
        validator: function(v) {
          if (this.type === 'MCQ') {
            return Array.isArray(v) && v.length === 4; // Exactly 4 options for MCQ
          }
          return !v || v.length === 0; // No options for Fill
        },
        message: function() {
          if (this.type === 'MCQ') {
            return 'MCQ questions must have exactly 4 options';
          }
          return 'Fill questions should not have options';
        }
      }
    },
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function(value) {
          if (this.type === 'MCQ') {
            return Number.isInteger(value) && value >= 0 && value < 4; // Index must be 0-3
          }
          return typeof value === 'string' && value.trim().length > 0; // For Fill type, non-empty string
        },
        message: function() {
          if (this.type === 'MCQ') {
            return 'Correct answer must be a valid index (0-3) for MCQ options';
          }
          return 'Fill questions must have a non-empty string as correct answer';
        }
      }
    },
    marks: {
      type: Number,
      default: 1,
      min: [1, 'Marks must be at least 1']
    }
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
});

// Middleware to handle question types before saving
QuizSchema.pre('save', function(next) {
  if (this.questions && Array.isArray(this.questions)) {
    this.questions = this.questions.map(question => {
      // For True/False questions - set standard options and handle answer
      if (question.type === 'TrueFalse') {
        // Set standard True/False options
        question.options = ['True', 'False'];
        
        // Convert correctAnswer to index if it's a boolean or string
        if (typeof question.correctAnswer === 'boolean') {
          question.correctAnswer = question.correctAnswer ? 0 : 1; // True = 0, False = 1
        } else if (typeof question.correctAnswer === 'string') {
          const answer = question.correctAnswer.toLowerCase();
          if (answer === 'true') {
            question.correctAnswer = 0;
          } else if (answer === 'false') {
            question.correctAnswer = 1;
          }
        }
      } 
      // For Fill questions, remove options completely
      else if (question.type === 'Fill') {
        question.options = undefined;
      }
      // For MCQ questions, ensure correctAnswer is a number and validate options length
      else if (question.type === 'MCQ') {
        if (typeof question.correctAnswer !== 'number') {
          question.correctAnswer = parseInt(question.correctAnswer, 10);
        }
        // Ensure exactly 4 options
        if (!question.options || question.options.length !== 4) {
          // If options are missing or incorrect length, you might want to throw an error
          // or set default empty options
          if (!question.options) {
            question.options = ['', '', '', ''];
          } else {
            // Pad or trim to exactly 4 options
            while (question.options.length < 4) {
              question.options.push('');
            }
            if (question.options.length > 4) {
              question.options = question.options.slice(0, 4);
            }
          }
        }
      }
      return question;
    });
  }
  next();
});

// Virtual field for total marks
QuizSchema.virtual('totalMarks').get(function() {
  return this.questions.reduce((total, question) => total + question.marks, 0);
});

// Virtual field for quiz length (number of questions)
QuizSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});

module.exports = mongoose.model('Quiz', QuizSchema);