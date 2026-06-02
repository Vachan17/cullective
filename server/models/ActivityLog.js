const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  action: {
    type: String,
    enum: [
      'project_created', 'project_deleted', 'photos_uploaded',
      'analysis_started', 'analysis_completed', 'photo_starred',
      'photo_rejected', 'photo_deleted', 'collection_created',
      'bulk_action', 'export_started'
    ],
    required: true,
  },
  details: { type: mongoose.Schema.Types.Mixed },
  count: { type: Number, default: 1 },
}, { timestamps: true });

activityLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
