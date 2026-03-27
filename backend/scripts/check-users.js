import mongoose from 'mongoose';
import 'dotenv/config';

const mongoUri = process.env.MONGODB_URI;

try {
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');
  
  const users = await mongoose.connection.db.collection('users').find().limit(5).toArray();
  
  users.forEach(u => {
    console.log(`- User: ${u.email}, Phone: ${u.phone}`);
  });
  
  await mongoose.disconnect();
} catch (error) {
  console.error('Error:', error);
}
process.exit(0);
