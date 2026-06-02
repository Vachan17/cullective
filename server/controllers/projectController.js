const Project = require('../models/Project');
const Photo = require('../models/Photo');
const Collection = require('../models/Collection');
const ActivityLog = require('../models/ActivityLog');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');

exports.getProjects = async (req, res) => {
  const { page = 1, limit = 12, status, shootType, search } = req.query;
  const query = { userId: req.user._id };
  if (status) query.status = status;
  if (shootType) query.shootType = shootType;
  if (search) query.name = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const [projects, total] = await Promise.all([
    Project.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Project.countDocuments(query),
  ]);

  return paginatedResponse(res, projects, {
    page: Number(page), limit: Number(limit),
    total, pages: Math.ceil(total / limit),
  });
};

exports.createProject = async (req, res) => {
  const { name, description, shootDate, shootType, tags } = req.body;
  const project = await Project.create({
    name, description, shootDate, shootType,
    tags: tags || [],
    userId: req.user._id,
  });

  await ActivityLog.create({ userId: req.user._id, projectId: project._id, action: 'project_created' });
  return successResponse(res, { project }, 'Project created', 201);
};

exports.getProject = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
  if (!project) return errorResponse(res, 'Project not found', 404);
  return successResponse(res, { project });
};

exports.updateProject = async (req, res) => {
  const { name, description, shootDate, shootType, tags, status } = req.body;
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { name, description, shootDate, shootType, tags, status },
    { new: true, runValidators: true }
  );
  if (!project) return errorResponse(res, 'Project not found', 404);
  return successResponse(res, { project }, 'Project updated');
};

exports.deleteProject = async (req, res) => {
  const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!project) return errorResponse(res, 'Project not found', 404);

  // Cascade delete
  await Promise.all([
    Photo.deleteMany({ projectId: project._id }),
    Collection.deleteMany({ projectId: project._id }),
  ]);

  return successResponse(res, null, 'Project deleted');
};

exports.getProjectStats = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
  if (!project) return errorResponse(res, 'Project not found', 404);

  const photos = await Photo.find({ projectId: project._id, status: { $ne: 'deleted' } });
  const analyzed = photos.filter(p => p.aiScore !== null);

  const qualityDist = {
    excellent: analyzed.filter(p => p.aiScore >= 85).length,
    good: analyzed.filter(p => p.aiScore >= 70 && p.aiScore < 85).length,
    average: analyzed.filter(p => p.aiScore >= 50 && p.aiScore < 70).length,
    poor: analyzed.filter(p => p.aiScore < 50).length,
  };

  const tagCounts = {};
  photos.forEach(p => (p.aiTags || []).forEach(tag => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }));

  return successResponse(res, {
    project,
    stats: {
      total: photos.length,
      analyzed: analyzed.length,
      starred: photos.filter(p => p.status === 'starred').length,
      rejected: photos.filter(p => p.status === 'rejected').length,
      duplicates: photos.filter(p => p.analysis?.isDuplicate).length,
      avgScore: analyzed.length ? Math.round(analyzed.reduce((s, p) => s + p.aiScore, 0) / analyzed.length) : 0,
      qualityDist,
      tagCounts,
    },
  });
};
