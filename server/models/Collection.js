const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String },
  type: {
    type: String,
    enum: ['auto', 'manual', 'smart'],
    default: 'manual',
  },
  category: {
    type: String,
    enum: [
      'best_picks', 'blurry', 'closed_eyes', 'group_photos', 'portraits',
      'couple_photos', 'black_white', 'color_graded', 'rejected',
      'instagram_worthy', 'album_ready', 'duplicates', 'noisy',
      'underexposed', 'overexposed', 'landscapes', 'wedding', 'night', 'custom'
    ],
    default: 'custom',
  },
  icon: { type: String, default: '📁' },
  color: { type: String, default: '#F59E0B' },
  photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
  photoCount: { type: Number, default: 0 },
  coverPhoto: { type: String, default: null },
  isSystem: { type: Boolean, default: false },
}, { timestamps: true });

collectionSchema.index({ projectId: 1, category: 1 });

module.exports = mongoose.model('Collection', collectionSchema);
