import mongoose from 'mongoose';
import 'dotenv/config';

const mongoUri = process.env.MONGODB_URI;

try {
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'tellonted03angle@gmail.com' });
  if (user) {
    console.log(`- User FOUND: ${user.email}, Phone: ${user.phone}`);
  } else {
    console.log('- User NOT FOUND');
  }
  await mongoose.disconnect();
} catch (error) { console.error('Error:', error); }
process.exit(0);
