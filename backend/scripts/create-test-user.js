import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const mongoUri = process.env.MONGODB_URI;

try {
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');
  
  const email = 'tellonted03angle@gmail.com';
  const existing = await mongoose.connection.db.collection('users').findOne({ email });
  
  if (!existing) {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    await mongoose.connection.db.collection('users').insertOne({
      email,
      passwordHash,
      name: 'Test Test',
      phone: '+919999999999',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ User created: ${email}`);
  } else {
    console.log(`User already exists: ${email}`);
  }
  
  await mongoose.disconnect();
} catch (error) { console.error('Error:', error); }
process.exit(0);
