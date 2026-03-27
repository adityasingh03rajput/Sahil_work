import mongoose from 'mongoose';
import 'dotenv/config';

const mongoUri = process.env.MONGODB_URI;

try {
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');
  
  const recentOtps = await mongoose.connection.db.collection('passwordresetotps').find().sort({ createdAt: -1 }).limit(10).toArray();
  
  recentOtps.forEach(otp => {
    console.log(`[${otp.createdAt}] To: ${otp.email} (User: ${otp.userId})`);
  });
  
  await mongoose.disconnect();
} catch (error) {
  console.error('Error:', error);
}
process.exit(0);
