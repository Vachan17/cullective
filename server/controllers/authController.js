const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return errorResponse(res, 'Email already registered', 400);

  const user = await User.create({ name, email, password });
  const token = generateToken(user._id);
  return successResponse(res, { token, user: user.toPublicJSON() }, 'Account created successfully', 201);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.password) return errorResponse(res, 'Invalid credentials', 401);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return errorResponse(res, 'Invalid credentials', 401);

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);
  return successResponse(res, { token, user: user.toPublicJSON() }, 'Login successful');
};

exports.googleAuth = async (req, res) => {
  const { credential } = req.body;
  if (!credential) return errorResponse(res, 'Google credential required', 400);

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const { sub: googleId, email, name, picture } = ticket.getPayload();

  let user = await User.findOne({ $or: [{ googleId }, { email }] });
  if (!user) {
    user = await User.create({ name, email, googleId, avatar: picture, isEmailVerified: true });
  } else if (!user.googleId) {
    user.googleId = googleId;
    user.avatar = user.avatar || picture;
    await user.save({ validateBeforeSave: false });
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);
  return successResponse(res, { token, user: user.toPublicJSON() }, 'Google login successful');
};

exports.getMe = async (req, res) => {
  return successResponse(res, { user: req.user.toPublicJSON ? req.user.toPublicJSON() : req.user });
};

exports.updateProfile = async (req, res) => {
  const { name, preferences } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (preferences) updates.preferences = { ...req.user.preferences, ...preferences };

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  return successResponse(res, { user: user.toPublicJSON() }, 'Profile updated');
};
