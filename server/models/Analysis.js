const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  photo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo',
    required: true,
    unique: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Technical quality metrics (0-100)
  metrics: {
    sharpness: { score: Number, label: String },
    exposure: { score: Number, label: String, value: Number },
    contrast: { score: Number, label: String },
    colorBalance: { score: Number, label: String },
    noise: { score: Number, label: String },
    composition: { score: Number, label: String },
    overallQuality: { score: Number, label: String },
  },

  // Detected issues
  issues: {
    isBlurry: { type: Boolean, default: false },
    isOutOfFocus: { type: Boolean, default: false },
    hasClosedEyes: { type: Boolean, default: false },
    isUnderexposed: { type: Boolean, default: false },
    isOverexposed: { type: Boolean, default: false },
    isNoisyHighISO: { type: Boolean, default: false },
    isDuplicate: { type: Boolean, default: false },
    isSimilarBurst: { type: Boolean, default: false },
    hasMotionBlur: { type: Boolean, default: false },
    isLowResolution: { type: Boolean, default: false },
  },

  // Content detection
  content: {
    hasfaces: { type: Boolean, default: false },
    faceCount: { type: Number, default: 0 },
    isPortrait: { type: Boolean, default: false },
    isGroupPhoto: { type: Boolean, default: false },
    isCouplePhoto: { type: Boolean, default: false },
    isLandscape: { type: Boolean, default: false },
    isBlackAndWhite: { type: Boolean, default: false },
    isColorGraded: { type: Boolean, default: false },
    sceneType: { type: String }, // indoor, outdoor, night, golden-hour
    dominantColors: [{ color: String, percentage: Number }],
  },

  // AI scores
  scores: {
    technical: { type: Number, min: 0, max: 100 },
    aesthetic: { type: Number, min: 0, max: 100 },
    composition: { type: Number, min: 0, max: 100 },
    overall: { type: Number, min: 0, max: 100 },
  },

  // AI editing recommendations
  recommendations: [{
    issue: String,
    fix: String,
    adjustments: {
      exposure: Number,
      shadows: Number,
      highlights: Number,
      contrast: Number,
      saturation: Number,
      temperature: Number,
      sharpening: Number,
    },
    priority: { type: String, enum: ['low', 'medium', 'high'] },
  }],

  // Auto-assigned smart tags
  autoTags: [String],
  
  // Confidence of analysis (0-1)
  confidence: { type: Number, min: 0, max: 1, default: 0 },
  
  // Model info
  analysisVersion: { type: String, default: '1.0' },
  analyzedAt: { type: Date },
  processingTimeMs: { type: Number },
}, {
  timestamps: true,
});

analysisSchema.index({ photo: 1 });
analysisSchema.index({ project: 1, 'scores.overall': -1 });

module.exports = mongoose.model('Analysis', analysisSchema);
