const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 6, select: false },
  googleId: { type: String, sparse: true },
  avatar: { type: String, default: null },
  plan: { type: String, enum: ['free', 'pro', 'studio'], default: 'free' },
  storageUsed: { type: Number, default: 0 }, // bytes
  storageLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5GB
  isEmailVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  preferences: {
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    defaultView: { type: String, enum: ['grid', 'list'], default: 'grid' },
    autoAnalyze: { type: Boolean, default: true },
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
