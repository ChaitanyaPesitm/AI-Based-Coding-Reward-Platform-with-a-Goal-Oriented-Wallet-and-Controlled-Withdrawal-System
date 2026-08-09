const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coding-reward-platform';
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ Primary MongoDB connection failed (${error.message}). Attempting in-memory database fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      const conn = await mongoose.connect(mongoUri);
      console.log(`⚡ In-Memory MongoDB Connected at ${mongoUri}`);
    } catch (memError) {
      console.error(`❌ In-Memory MongoDB Connection Error: ${memError.message}`);
      process.exit(1);
    }
  }

  // Auto-seed admin user and default problems
  const autoSeed = require('../utils/autoSeed');
  await autoSeed();
};

module.exports = connectDB;
