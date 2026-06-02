const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  cloudinaryId: { type: String, required: true },
  url:          { type: String, required: true },
  thumbnailUrl: { type: String },
  width:        { type: Number },
  height:       { type: Number },
  fileSize:     { type: Number },
  format:       { type: String },
  status: {
    type: String,
    enum: ['pending','analyzing','analyzed','starred','rejected','deleted'],
    default: 'pending',
  },
  aiScore:          { type: Number, min: 0, max: 100, default: null },
  aiTags:           [{ type: String }],
  pHash:            { type: String, default: null },
  duplicateGroupId: { type: String, default: null },
  isBestInGroup:    { type: Boolean, default: false },
  analysis: {
    sharpness:    { score: Number, label: String },
    exposure:     { score: Number, label: String, ev: Number },
    noise:        { score: Number, label: String, isNoisy: Boolean },
    composition:  { score: Number, label: String, cloudinaryQuality: Number },
    faceCount:    { type: Number, default: 0 },
    eyesOpen:     { type: Boolean, default: null },
    isBlurry:         { type: Boolean, default: false },
    isDuplicate:      { type: Boolean, default: false },
    isUnderexposed:   { type: Boolean, default: false },
    isOverexposed:    { type: Boolean, default: false },
    isPortrait:       { type: Boolean, default: false },
    isGroupPhoto:     { type: Boolean, default: false },
    isCouplePhoto:    { type: Boolean, default: false },
    isLandscape:      { type: Boolean, default: false },
    isBlackAndWhite:  { type: Boolean, default: false },
    isColorGraded:    { type: Boolean, default: false },
    isWedding:        { type: Boolean, default: false },
    isIndoor:         { type: Boolean, default: false },
    isNight:          { type: Boolean, default: false },
    sceneTags:        [{ type: String }],
    dominantColors:   [{ color: String, percentage: Number }],
    recommendations: [{
      issue: String,
      severity: { type: String, enum: ['low','medium','high'] },
      suggestedFix: String,
      params: mongoose.Schema.Types.Mixed,
    }],
    confidence:   { type: Number },
    analyzedWith: { type: String },  // 'cloudinary+sharp' | 'sharp-only'
  },
  metadata: {
    camera: String, lens: String, iso: Number,
    aperture: String, shutterSpeed: String, focalLength: String,
    takenAt: Date, gpsLat: Number, gpsLng: Number,
  },
  editingStatus: { type: String, enum: ['unedited','edited','exported'], default: 'unedited' },
  collections:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }],
  notes:         { type: String, maxlength: 500 },
  analyzedAt:    { type: Date },
}, { timestamps: true });

photoSchema.index({ projectId: 1, status: 1 });
photoSchema.index({ projectId: 1, aiScore: -1 });
photoSchema.index({ duplicateGroupId: 1 });
photoSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Photo', photoSchema);
