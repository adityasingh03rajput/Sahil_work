import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    passwordHistory: { type: [String], default: [] },
    name: { type: String, default: null },
    phone: { type: String, required: true, index: true, trim: true },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
