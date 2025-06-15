# Quiz App Backend

A comprehensive RESTful API backend for a quiz application built with Node.js, Express, and MongoDB. This backend supports user authentication, quiz management, quiz attempts, and admin functionality.

## 🚀 Features

- **User Authentication**: JWT-based authentication with signup, login, and password reset
- **Role-Based Access Control**: Support for regular users and admin users
- **Quiz Management**: Create, read, update, and delete quizzes
- **Quiz Attempts**: Track and store quiz attempts with scoring
- **Admin Dashboard**: Administrative features for managing users and quizzes
- **Email Integration**: Password reset functionality via email
- **Input Validation**: Comprehensive request validation using express-validator
- **Error Handling**: Centralized error handling middleware

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB database
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/unsa-memon/quiz-app-backend.git
   cd quiz-app-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory with the following variables:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/quiz-app
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRE=30d
   
   # Email configuration (for password reset)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Start the server**
   ```bash
   # Development mode with nodemon
   npm run dev
   
   # Production mode
   npm start
   ```

## 📁 Project Structure

```
quiz-app-backend/
├── config/
│   └── db.js                 # Database connection configuration
├── controllers/
│   ├── adminController.js    # Admin-related operations
│   ├── authController.js     # Authentication operations
│   ├── quizController.js     # Quiz management operations
│   └── userController.js     # User profile operations
├── middleware/
│   └── auth.js              # Authentication middleware
├── models/
│   ├── Quiz.js              # Quiz data model
│   ├── QuizAttempt.js       # Quiz attempt data model
│   └── User.js              # User data model
├── routes/
│   ├── admin.js             # Admin routes
│   ├── auth.js              # Authentication routes
│   ├── quizzes.js           # Quiz routes
│   └── user.js              # User routes
├── scripts/
│   ├── createAdmin.js       # Script to create admin user
│   └── createAdminOnce.js   # One-time admin creation script
├── utils/
│   ├── errorHandler.js      # Error handling utilities
│   └── sendEmail.js         # Email sending utilities
├── package.json
└── server.js                # Main application entry point
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 📚 API Endpoints

### 🔐 Authentication Routes (`/api/auth`)

| Method | Endpoint                      | Description                | Access  |
| ------ | ----------------------------- | -------------------------- | ------- |
| POST   | `/signup`                     | Register a new user        | Public  |
| POST   | `/login`                      | Log in a user              | Public  |
| GET    | `/me`                         | Get current user profile   | Private |
| POST   | `/forgot-password`            | Send password reset email  | Public  |
| PUT    | `/reset-password/:resettoken` | Reset password using token | Public  |

---

### 📝 Quiz Routes (`/api/quizzes`)

| Method | Endpoint                      | Description               | Access          |
| ------ | ----------------------------- | ------------------------- | --------------- |
| GET    | `/`                           | Get all published quizzes | Public          |
| GET    | `/:id`                        | Get a specific quiz by ID | Public          |
| POST   | `/`                           | Create a new quiz         | Private         |
| PUT    | `/:id`                        | Update a quiz             | Private (Owner) |
| DELETE | `/:id`                        | Delete a quiz             | Private (Owner) |
| POST   | `/:id/attempt`                | Submit a quiz attempt     | Private         |
| GET    | `/attempt/:attemptId/results` | Get quiz attempt results  | Private         |

---

### 👤 User Routes (`/api/users`)

| Method | Endpoint    | Description              | Access  |
| ------ | ----------- | ------------------------ | ------- |
| GET    | `/profile`  | Get user profile         | Private |
| PUT    | `/profile`  | Update user profile      | Private |
| GET    | `/attempts` | Get user’s quiz attempts | Private |

---

### 🛠️ Admin Routes (`/api/admin`)

| Method | Endpoint       | Description                      | Access          |
| ------ | -------------- | -------------------------------- | --------------- |
| GET    | `/stats`       | Get overall app statistics       | Private (Admin) |
| GET    | `/users`       | Get all registered users         | Private (Admin) |
| DELETE | `/users/:id`   | Delete a user and their data     | Private (Admin) |
| DELETE | `/quizzes/:id` | Delete any quiz and its attempts | Private (Admin) |

## 📊 Data Models

### User Model
```javascript
{
  name: String,           // User's full name
  email: String,          // Unique email address
  password: String,       // Hashed password
  role: String,           // 'user' or 'admin'
  isActive: Boolean,      // Account status
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Quiz Model
```javascript
{
  title: String,          // Quiz title
  description: String,    // Quiz description
  questions: Array,       // Array of question objects
  createdBy: ObjectId,    // Reference to User
  isPublished: Boolean,   // Publication status
  category: String,       // Quiz category
  difficulty: String,     // Easy, Medium, Hard
  timeLimit: Number,      // Time limit in minutes
  passingScore: Number,   // Minimum score to pass
  tags: Array,           // Array of tags
  createdAt: Date,
  updatedAt: Date
}
```

### QuizAttempt Model
```javascript
{
  user: ObjectId,         // Reference to User
  quiz: ObjectId,         // Reference to Quiz
  answers: Array,         // User's answers
  score: Number,          // Total score achieved
  totalQuestions: Number, // Total questions in quiz
  percentage: Number,     // Score percentage
  passed: Boolean,        // Whether attempt passed
  timeSpent: Number,      // Time spent in seconds
  submittedAt: Date,
  createdAt: Date
}
```

## 🔧 Configuration

### Database Connection
The application connects to MongoDB using the connection string provided in the `MONGODB_URI` environment variable. The database configuration is handled in `config/db.js`.

### JWT Configuration
JWT tokens are configured with:
- Secret key from `JWT_SECRET` environment variable
- Expiration time from `JWT_EXPIRE` environment variable (default: 30 days)

### Email Configuration
For password reset functionality, configure SMTP settings:
- Host, port, username, and password in environment variables
- Uses Nodemailer for sending emails

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_strong_jwt_secret
JWT_EXPIRE=30d
EMAIL_HOST=your_smtp_host
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

### Static File Serving
In production mode, the server serves static files from `../client/build` directory for React frontend integration.

## 📝 Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with nodemon
- `node scripts/createAdmin.js` - Create an admin user
- `node scripts/createAdminOnce.js` - Create admin user (one-time script)

## 🛡️ Security Features

- Password hashing using bcryptjs
- JWT token-based authentication
- Input validation and sanitization
- CORS enabled for cross-origin requests
- Environment-based configuration
- Role-based access control

## 🐛 Error Handling

The application includes comprehensive error handling:
- Global error handling middleware
- Validation error responses
- Detailed error logging in development
- Generic error messages in production

## 📦 Dependencies

### Main Dependencies
- **express** - Web application framework
- **mongoose** - MongoDB object modeling
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT implementation
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **express-validator** - Input validation
- **nodemailer** - Email sending

### Development Dependencies
- **nodemon** - Development server with auto-restart

**Note**: Make sure to keep your environment variables secure and never commit them to version control. Use proper database credentials and strong JWT secrets in production.

