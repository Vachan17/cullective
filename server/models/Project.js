const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 1000 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coverImage: { type: String, default: null },
  shootDate: { type: Date },
  shootType: {
    type: String,
    enum: ['wedding', 'portrait', 'event', 'commercial', 'landscape', 'wildlife', 'sports', 'other'],
    default: 'other',
  },
  status: {
    type: String,
    enum: ['empty', 'uploading', 'analyzing', 'ready', 'archived'],
    default: 'empty',
  },
  totalPhotos: { type: Number, default: 0 },
  analyzedPhotos: { type: Number, default: 0 },
  bestPicksCount: { type: Number, default: 0 },
  rejectedCount: { type: Number, default: 0 },
  duplicatesCount: { type: Number, default: 0 },
  totalSize: { type: Number, default: 0 }, // bytes
  tags: [{ type: String, trim: true }],
  isShared: { type: Boolean, default: false },
  shareToken: { type: String, default: null },
}, { timestamps: true });

projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Project', projectSchema);
