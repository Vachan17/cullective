const Project = require('../models/Project');
const Photo = require('../models/Photo');
const ActivityLog = require('../models/ActivityLog');
const { successResponse } = require('../utils/apiResponse');

exports.getDashboard = async (req, res) => {
  const userId = req.user._id;

  const [
    totalProjects, recentProjects, totalPhotos,
    analyzedPhotos, starredPhotos, rejectedPhotos, recentActivity
  ] = await Promise.all([
    Project.countDocuments({ userId }),
    Project.find({ userId }).sort({ createdAt: -1 }).limit(5),
    Photo.countDocuments({ userId, status: { $ne: 'deleted' } }),
    Photo.countDocuments({ userId, status: 'analyzed', aiScore: { $ne: null } }),
    Photo.countDocuments({ userId, status: 'starred' }),
    Photo.countDocuments({ userId, status: 'rejected' }),
    ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(10),
  ]);

  const storageUsed = req.user.storageUsed || 0;
  const storageLimit = req.user.storageLimit || 5 * 1024 * 1024 * 1024;

  // Quality distribution across all analyzed photos
  const scoreAgg = await Photo.aggregate([
    { $match: { userId, aiScore: { $ne: null } } },
    { $bucket: {
      groupBy: '$aiScore',
      boundaries: [0, 25, 50, 70, 85, 101],
      default: 'other',
      output: { count: { $sum: 1 } }
    }}
  ]);

  return successResponse(res, {
    overview: { totalProjects, totalPhotos, analyzedPhotos, starredPhotos, rejectedPhotos },
    storage: { used: storageUsed, limit: storageLimit, percentage: Math.round((storageUsed / storageLimit) * 100) },
    recentProjects,
    recentActivity,
    qualityDistribution: scoreAgg,
  });
};
