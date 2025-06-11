const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Define User Schema
const UserSchema = new mongoose.Schema( 
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Don't return password by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date
    },
    passwordChangedAt: Date
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Ensure password is saved as plain text
UserSchema.pre('save', function(next) {
  // Only run this if password was modified
  if (this.isModified('password')) {
    console.log('Password before save (in pre-save hook):', this.password);
    // Force plain text password by bypassing any potential hashing
    this._plainPassword = this.password;
    this.password = this._plainPassword;
  }
  next();
});

// Add post-save hook to clean up
UserSchema.post('save', function(doc) {
  console.log('Password after save (in post-save hook):', doc.password);
  if (this._plainPassword) {
    this.password = this._plainPassword;
    delete this._plainPassword;
  }
});


// Instance method to check if password is correct
UserSchema.methods.correctPassword = function(candidatePassword, userPassword) {
  // Direct string comparison since passwords are stored in plain text
  return candidatePassword === userPassword;
};

// Instance method to check if password was changed after token was issued
UserSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      role: this.role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '30d' 
    }
  );
};

// Match user entered password to plain text password in database
UserSchema.methods.matchPassword = function(enteredPassword) {
  return enteredPassword === this.password;
};

// Create and export the User model
const User = mongoose.model('User', UserSchema);

module.exports = User;
