const Photo = require('../models/Photo');
const Project = require('../models/Project');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { fetchCloudinaryImageDetails } = require('../utils/cloudinaryResource');

const { successResponse, errorResponse, paginatedResponse } = require('../utils/apiResponse');
const { analyzePhoto, comparePHash } = require('../services/aiAnalysisService');
const ActivityLog = require('../models/ActivityLog');
const axios = require('axios');

// ─── Upload (chunked batch — called once per batch of ≤20 files) ─────────────
exports.uploadPhotos = async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findOne({ _id: projectId, userId: req.user._id });
  if (!project) return errorResponse(res, 'Project not found', 404);
  if (!req.files || req.files.length === 0) return errorResponse(res, 'No files in this batch', 400);

  const savedPhotos = [];
  let totalSize = 0;

  for (const file of req.files) {
    const photo = await Photo.create({
      projectId,
      userId: req.user._id,
      filename: file.filename || file.public_id,
      originalName: file.originalname,
      cloudinaryId: file.public_id || file.filename,
      url: file.path || file.secure_url,
      thumbnailUrl: file.path
        ? file.path.replace('/upload/', '/upload/w_400,h_400,c_fill,q_auto,f_auto/')
        : null,
      width: file.width,
      height: file.height,
      fileSize: file.size,
      format: file.format || file.mimetype?.split('/')[1],
      status: 'pending',
    });
    savedPhotos.push(photo);
    totalSize += file.size || 0;
  }

  // Update project counters
  await Project.findByIdAndUpdate(projectId, {
    $inc: { totalPhotos: savedPhotos.length, totalSize: totalSize },
    $set: {
      status: 'uploading',
      ...((!project.coverImage && savedPhotos[0]) ? { coverImage: savedPhotos[0].thumbnailUrl || savedPhotos[0].url } : {}),
    },
  });
  await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: totalSize } });

  return successResponse(res, { photos: savedPhotos, count: savedPhotos.length }, 'Batch uploaded', 201);
};

// ─── Finalize upload session (trigger background analysis) ───────────────────
exports.finalizeUpload = async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findOne({ _id: projectId, userId: req.user._id });
  if (!project) return errorResponse(res, 'Project not found', 404);

  await ActivityLog.create({ userId: req.user._id, projectId, action: 'photos_uploaded', count: project.totalPhotos });

  if (req.user.preferences?.autoAnalyze !== false) {
    setImmediate(() => autoAnalyzeAllPending(project, req.user._id));
  }

  return successResponse(res, { message: 'Upload finalized, analysis queued', total: project.totalPhotos });
};

const autoAnalyzeAllPending = async (project, userId) => {
  try {
    const photos = await Photo.find({ projectId: project._id, status: 'pending' });
    await Project.findByIdAndUpdate(project._id, { status: 'analyzing' });
    const hashes = [];
    const existingPhotos = await Photo.find({ projectId: project._id, status: { $ne: 'pending' } });
    for (const p of existingPhotos) {
      if (p.pHash && p.duplicateGroupId) {
        hashes.push({ hash: p.pHash, groupId: p.duplicateGroupId });
      }
    }

    for (const photo of photos) {
      try {
        let buffer;
        if (photo.cloudinaryId?.startsWith('local:')) {
          const fs = require('fs');
          let filePath = photo.url;
          if (process.platform === 'win32') {
            filePath = filePath.replace(/^\/host\/([a-zA-Z])\//i, '$1:\\')
                               .replace(/\\host\\([a-zA-Z])\\/gi, '$1:\\')
                               .replace(/\/host\/([a-zA-Z])\//gi, '$1:/');
          }
          buffer = fs.readFileSync(filePath);
        } else {
          const r = await axios.get(photo.url, { responseType: 'arraybuffer', timeout: 30000 });
          buffer = Buffer.from(r.data);
        }

        const cldId = photo.cloudinaryId?.startsWith("local:") ? null : photo.cloudinaryId;
        const result = await analyzePhoto(buffer, cldId, project.shootType);

        let isDuplicate = false, duplicateGroupId = photo.duplicateGroupId;
        if (result.pHash) {
          for (const prev of hashes) {
            if (comparePHash(result.pHash, prev.hash) >= 80) {
              isDuplicate = true; duplicateGroupId = prev.groupId; break;
            }
          }
          if (!isDuplicate) {
            duplicateGroupId = photo._id.toString();
            hashes.push({ hash: result.pHash, groupId: duplicateGroupId });
          }
          result.analysis.isDuplicate = isDuplicate;
        }

        await Photo.findByIdAndUpdate(photo._id, {
          status: 'analyzed', aiScore: result.aiScore, aiTags: result.aiTags,
          pHash: result.pHash, analysis: result.analysis, duplicateGroupId, analyzedAt: new Date(),
        });
        await Project.findByIdAndUpdate(project._id, { $inc: { analyzedPhotos: 1 } });
      } catch (err) {
        console.error(`Auto-analysis failed for ${photo._id}:`, err.message);
        await Photo.findByIdAndUpdate(photo._id, { status: 'pending', aiTags: [] });
      }
    }

    // Best-in-group pass
    const groups = {};
    const allP = await Photo.find({ projectId: project._id });
    for (const p of allP) {
      if (p.duplicateGroupId && (!groups[p.duplicateGroupId] || p.aiScore > groups[p.duplicateGroupId].score))
        groups[p.duplicateGroupId] = { id: p._id, score: p.aiScore };
    }
    for (const best of Object.values(groups))
      await Photo.findByIdAndUpdate(best.id, { isBestInGroup: true });

    const analyzed = await Photo.find({ projectId: project._id, aiScore: { $ne: null } });
    await Project.findByIdAndUpdate(project._id, {
      status: 'ready',
      duplicatesCount: analyzed.filter(p => p.analysis?.isDuplicate).length,
      bestPicksCount: analyzed.filter(p => p.aiScore >= 80).length,
    });

    const { buildSystemCollections } = require('../services/collectionService');
    await buildSystemCollections(project._id, userId);
    await ActivityLog.create({ userId, projectId: project._id, action: 'analysis_completed', count: photos.length });
  } catch (err) {
    console.error('Auto-analyze error:', err);
    await Project.findByIdAndUpdate(project._id, { status: 'ready' });
  }
};

// ─── Get photos ──────────────────────────────────────────────────────────────
exports.getPhotos = async (req, res) => {
  const { projectId } = req.params;
  const { page = 1, limit = 50, status, tag, sort = '-createdAt', minScore, search } = req.query;
  const query = { projectId, userId: req.user._id, status: { $nin: ['deleted', 'rejected'] } };
  if (status) query.status = status;
  if (tag) query.aiTags = tag;
  if (minScore) query.aiScore = { $gte: Number(minScore) };
  if (search) query.$or = [
    { originalName: { $regex: search, $options: 'i' } },
    { aiTags: { $regex: search, $options: 'i' } },
  ];
  const skip = (page - 1) * limit;
  const [photos, total] = await Promise.all([
    Photo.find(query).sort(sort).skip(skip).limit(Number(limit)),
    Photo.countDocuments(query),
  ]);
  return paginatedResponse(res, photos, { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) });
};

exports.getPhotoDetail = async (req, res) => {
  const photo = await Photo.findOne({ _id: req.params.id, userId: req.user._id });
  if (!photo) return errorResponse(res, 'Photo not found', 404);

  // Enrich with Cloudinary metadata (best-effort)
  try {
    const details = await fetchCloudinaryImageDetails(photo.cloudinaryId);
    if (details) {
      const merged = {
        ...photo.toObject(),
        ...(details.width ? { width: details.width } : {}),
        ...(details.height ? { height: details.height } : {}),
        ...(details.format ? { format: details.format } : {}),
        ...(details.fileSize ? { fileSize: details.fileSize } : {}),
        ...(details.url ? { url: details.url } : {}),
      };

      // Persist for faster subsequent reads (non-blocking)
      const update = {
        ...(details.width ? { width: details.width } : {}),
        ...(details.height ? { height: details.height } : {}),
        ...(details.format ? { format: details.format } : {}),
        ...(details.fileSize ? { fileSize: details.fileSize } : {}),
        ...(details.url ? { url: details.url } : {}),
      };

      if (Object.keys(update).length) {
        Photo.findByIdAndUpdate(photo._id, { $set: update }).catch(() => {});
      }

      return successResponse(res, { photo: merged });
    }
  } catch (err) {
    // Don’t break photo detail if Cloudinary enrichment fails.
    console.warn('Cloudinary enrichment failed:', err.message);
  }

  return successResponse(res, { photo });
};


exports.updatePhotoStatus = async (req, res) => {
  const { status, notes } = req.body;
  const photo = await Photo.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { ...(status && { status }), ...(notes !== undefined && { notes }) },
    { new: true }
  );
  if (!photo) return errorResponse(res, 'Photo not found', 404);
  return successResponse(res, { photo }, 'Updated');
};

exports.deletePhoto = async (req, res) => {
  const photo = await Photo.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id }, { status: 'deleted' }, { new: true }
  );
  if (!photo) return errorResponse(res, 'Not found', 404);
  await Project.findByIdAndUpdate(photo.projectId, { $inc: { totalPhotos: -1 } });
  return successResponse(res, null, 'Deleted');
};

exports.bulkAction = async (req, res) => {
  const { photoIds, action } = req.body;
  if (!photoIds?.length || !action) return errorResponse(res, 'photoIds and action required', 400);
  const statusMap = { star: 'starred', reject: 'rejected', restore: 'analyzed', delete: 'deleted' };
  const newStatus = statusMap[action];
  if (!newStatus) return errorResponse(res, 'Invalid action', 400);
  const result = await Photo.updateMany({ _id: { $in: photoIds }, userId: req.user._id }, { status: newStatus });
  await ActivityLog.create({ userId: req.user._id, action: 'bulk_action', count: result.modifiedCount, details: { action } });
  return successResponse(res, { modifiedCount: result.modifiedCount }, `Bulk ${action} applied`);
};

exports.searchPhotos = async (req, res) => {
  const { q, projectId } = req.query;
  if (!q) return errorResponse(res, 'Search query required', 400);
  const keywords = q.toLowerCase().split(' ');
  const tagMap = {
    blurry:'blurry', blur:'blurry', portrait:'solo', solo:'solo', group:'group', couple:'couple',
    landscape:'landscape', 'b&w':'black-and-white', black:'black-and-white',
    best:'best-pick', instagram:'instagram-worthy', dark:'underexposed', bright:'overexposed',
    underexposed:'underexposed', overexposed:'overexposed', sharp:null,
  };
  const matchedTags = keywords.map(k => tagMap[k]).filter(Boolean);
  const query = { userId: req.user._id, status: { $nin: ['deleted', 'rejected'] } };
  if (projectId) query.projectId = projectId;
  if (matchedTags.length) query.aiTags = { $in: matchedTags };
  else query.$or = [
    { originalName: { $regex: q, $options: 'i' } },
    { aiTags: { $regex: q, $options: 'i' } },
  ];
  const photos = await Photo.find(query).sort('-aiScore').limit(100);
  return successResponse(res, { photos, count: photos.length, query: q });
};

exports.openLocalPhoto = async (req, res) => {
  const { photoId, app } = req.body;
  if (!photoId) return errorResponse(res, 'photoId is required', 400);

  try {
    const photo = await Photo.findOne({ _id: photoId, userId: req.user._id });
    if (!photo) return errorResponse(res, 'Photo not found', 404);

    let filePath = photo.url;
    if (process.platform === 'win32') {
      filePath = filePath.replace(/^\/host\/([a-zA-Z])\//i, '$1:\\')
                         .replace(/\\host\\([a-zA-Z])\\/gi, '$1:\\')
                         .replace(/\/host\/([a-zA-Z])\//gi, '$1:/');
      const pathModule = require('path');
      filePath = pathModule.resolve(filePath);
    }

    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return errorResponse(res, `Local file not found on disk at: ${filePath}`, 404);
    }

    if (app === 'lightroom') {
      const { exec } = require('child_process');
      exec('reg query "HKCR\\lightroom\\shell\\open\\command" /ve', (err, stdout) => {
        let lrPath = 'C:\\Program Files\\Adobe\\Adobe Lightroom Classic\\Lightroom.exe';
        if (!err && stdout) {
          const match = stdout.match(/"([^"]+)"/);
          if (match && match[1]) {
            lrPath = match[1];
          }
        }

        const { execFile } = require('child_process');
        console.log(`Launching Lightroom at: ${lrPath} with: ${filePath}`);
        
        execFile(lrPath, [filePath], (execErr) => {
          if (execErr) {
            console.error('Failed to open photo in Lightroom:', execErr);
            return errorResponse(res, `Failed to open in Lightroom: ${execErr.message}`, 500);
          }
          return successResponse(res, null, 'Opened in Lightroom Classic');
        });
      });
    } else if (app === 'photoshop') {
      const fs = require('fs');
      const pathModule = require('path');
      let psPath = null;
      
      const adobeDir = 'C:\\Program Files\\Adobe';
      if (fs.existsSync(adobeDir)) {
        const dirs = fs.readdirSync(adobeDir);
        const psDir = dirs.find(d => d.startsWith('Adobe Photoshop'));
        if (psDir) {
          const candidate = pathModule.join(adobeDir, psDir, 'Photoshop.exe');
          if (fs.existsSync(candidate)) {
            psPath = candidate;
          }
        }
      }

      if (!psPath) {
        return errorResponse(res, 'Adobe Photoshop installation not found on this machine.', 404);
      }

      const { execFile } = require('child_process');
      console.log(`Launching Photoshop at: ${psPath} with: ${filePath}`);
      execFile(psPath, [filePath], (execErr) => {
        if (execErr) {
          console.error('Failed to open photo in Photoshop:', execErr);
          return errorResponse(res, `Failed to open in Photoshop: ${execErr.message}`, 500);
        }
        return successResponse(res, null, 'Opened in Photoshop');
      });
    } else {
      return errorResponse(res, 'Unsupported application', 400);
    }
  } catch (err) {
    console.error('openLocalPhoto error:', err);
    return errorResponse(res, err.message, 500);
  }
};

exports.getLocalFile = async (req, res) => {
  const { photoId } = req.query;
  if (!photoId) return errorResponse(res, 'photoId is required', 400);

  try {
    const photo = await Photo.findOne({ _id: photoId, userId: req.user._id });
    if (!photo) return errorResponse(res, 'Photo not found', 404);

    let filePath = photo.url;
    if (process.platform === 'win32') {
      filePath = filePath.replace(/^\/host\/([a-zA-Z])\//i, '$1:\\')
                         .replace(/\\host\\([a-zA-Z])\\/gi, '$1:\\')
                         .replace(/\/host\/([a-zA-Z])\//gi, '$1:/');
      const pathModule = require('path');
      filePath = pathModule.resolve(filePath);
    }

    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return errorResponse(res, `File not found on disk at: ${filePath}`, 404);
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error('getLocalFile error:', err);
    return errorResponse(res, err.message, 500);
  }
};

