const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load env vars
dotenv.config({ path: '.env' });

const createAdmin = async () => {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'unsa@gmail.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      name: 'Admin',
      email: 'unsa@gmail.com',
      password: 'unsaunsa', // This will be hashed by the pre-save hook
      role: 'admin',
      isActive: true
    });

    await admin.save();
    console.log('✅ Admin user created successfully');
    console.log('Email: unsa@gmail.com');
    console.log('Password: unsaunsa');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();
