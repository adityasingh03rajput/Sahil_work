import mongoose from 'mongoose';
import 'dotenv/config';

const mongoUri = process.env.MONGODB_URI;

console.log('Testing MongoDB connection...');
console.log('URI:', mongoUri?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

try {
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000, // 5 second timeout
    connectTimeoutMS: 10000, // 10 second timeout
  });
  
  console.log('✅ Connected successfully!');
  
  // Test a simple query
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('📁 Collections found:', collections.map(c => c.name));
  
  await mongoose.disconnect();
  console.log('✅ Disconnected');
  
} catch (error) {
  console.error('❌ Connection failed:');
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  
  // Common error explanations
  if (error.code === 'ENOTFOUND') {
    console.log('💡 DNS resolution failed - check internet connection');
  } else if (error.code === 'ETIMEDOUT') {
    console.log('💡 Connection timeout - check firewall/network');
  } else if (error.message.includes('authentication')) {
    console.log('💡 Authentication failed - check username/password');
  } else if (error.message.includes('not authorized')) {
    console.log('💡 User permissions issue - check database access');
  }
}

process.exit(0);
