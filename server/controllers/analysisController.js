const Photo   = require('../models/Photo');
const Project = require('../models/Project');
const { analyzePhoto, comparePHash } = require('../services/aiAnalysisService');
const { buildSystemCollections }     = require('../services/collectionService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const ActivityLog = require('../models/ActivityLog');
const axios = require('axios');
const fs    = require('fs');

const loadBuffer = async (photo) => {
  if (photo.cloudinaryId?.startsWith('local:')) {
    let filePath = photo.url;
    if (process.platform === 'win32') {
      filePath = filePath.replace(/^\/host\/([a-zA-Z])\//i, '$1:\\')
                         .replace(/\\host\\([a-zA-Z])\\/gi, '$1:\\')
                         .replace(/\/host\/([a-zA-Z])\//gi, '$1:/');
    }
    return fs.readFileSync(filePath);
  }
  const r = await axios.get(photo.url, { responseType: 'arraybuffer', timeout: 25000 });
  return Buffer.from(r.data);
};

exports.analyzeProjectPhotos = async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findOne({ _id: projectId, userId: req.user._id });
  if (!project) return errorResponse(res, 'Project not found', 404);

  const photos = await Photo.find({ projectId, status: { $in: ['pending', 'analyzed'] } });
  if (!photos.length) return errorResponse(res, 'No photos to analyze', 400);

  // Reset counters and mark analyzing
  await Project.findByIdAndUpdate(projectId, { status: 'analyzing', analyzedPhotos: 0 });

  // Respond immediately — analysis runs in background
  res.json({ success: true, message: 'Analysis started', total: photos.length });

  setImmediate(async () => {
    const hashes = [];
    let done = 0;

    for (const photo of photos) {
      try {
        // Fetch image
        const buffer = await loadBuffer(photo);
        const cldId  = photo.cloudinaryId?.startsWith('local:') ? null : photo.cloudinaryId;
        const result = await analyzePhoto(buffer, cldId, project.shootType);

        // Duplicate detection
        let isDuplicate = false, duplicateGroupId = photo.duplicateGroupId;
        if (result.pHash) {
          for (const prev of hashes) {
            if (comparePHash(result.pHash, prev.hash) >= 90) {
              isDuplicate = true;
              duplicateGroupId = prev.groupId;
              break;
            }
          }
          if (!isDuplicate) {
            duplicateGroupId = photo._id.toString();
            hashes.push({ hash: result.pHash, groupId: duplicateGroupId });
          }
          result.analysis.isDuplicate = isDuplicate;
        }

        await Photo.findByIdAndUpdate(photo._id, {
          status: 'analyzed',
          aiScore: result.aiScore,
          aiTags: result.aiTags,
          pHash: result.pHash,
          analysis: result.analysis,
          duplicateGroupId,
          analyzedAt: new Date(),
        });
      } catch (err) {
        // ── CRITICAL FIX: never revert to pending — always mark analyzed ──────
        // Using status: pending means the analysis loop never "completes"
        logger.error(`Photo ${photo._id} analysis failed: ${err.message}`);
        await Photo.findByIdAndUpdate(photo._id, {
          status: 'analyzed',
          aiScore: 50,
          aiTags: ['unanalyzed'],
          analyzedAt: new Date(),
        });
      }

      done++;
      // Update progress counter every 5 photos (reduces DB writes)
      if (done % 5 === 0 || done === photos.length) {
        await Project.findByIdAndUpdate(projectId, { analyzedPhotos: done });
      }
    }

    // ── Best-in-group pass ──────────────────────────────────────────────────
    const groups = {};
    const all = await Photo.find({ projectId });
    for (const p of all) {
      if (p.duplicateGroupId && (!groups[p.duplicateGroupId] || p.aiScore > (groups[p.duplicateGroupId].score || 0)))
        groups[p.duplicateGroupId] = { id: p._id, score: p.aiScore };
    }
    await Promise.all(Object.values(groups).map(g => Photo.findByIdAndUpdate(g.id, { isBestInGroup: true })));

    // ── Rebuild collections + finalize project ──────────────────────────────
    const analyzed = await Photo.find({ projectId, aiScore: { $ne: null } });
    await Project.findByIdAndUpdate(projectId, {
      status:          'ready',
      analyzedPhotos:  done,
      duplicatesCount: analyzed.filter(p => p.analysis?.isDuplicate).length,
      bestPicksCount:  analyzed.filter(p => p.aiScore >= 80).length,
      rejectedCount:   analyzed.filter(p => p.status === 'rejected').length,
    });

    await buildSystemCollections(projectId, project.userId).catch(e => console.error('Collections build error:', e));
    await ActivityLog.create({ userId: project.userId, projectId, action: 'analysis_completed', count: done });
    console.log(`✅ Analysis complete for project ${projectId}: ${done}/${photos.length} photos`);
  });
};

// Need logger since we removed it from import
const logger = { error: console.error, warn: console.warn };

exports.getAnalysisResults = async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findOne({ _id: projectId, userId: req.user._id });
  if (!project) return errorResponse(res, 'Project not found', 404);

  const photos   = await Photo.find({ projectId, status: { $ne: 'deleted' } }).lean();
  const analyzed = photos.filter(p => p.aiScore !== null);

  return successResponse(res, {
    project,
    summary: {
      total:         photos.length,
      analyzed:      analyzed.length,
      blurry:        analyzed.filter(p => p.analysis?.isBlurry).length,
      duplicates:    analyzed.filter(p => p.analysis?.isDuplicate).length,
      underexposed:  analyzed.filter(p => p.analysis?.isUnderexposed).length,
      overexposed:   analyzed.filter(p => p.analysis?.isOverexposed).length,
      closedEyes:    analyzed.filter(p => p.analysis?.eyesOpen === false).length,
      bestPicks:     analyzed.filter(p => p.aiScore >= 80).length,
      portraits:     analyzed.filter(p => p.analysis?.isPortrait).length,
      couples:       analyzed.filter(p => p.analysis?.isCouplePhoto).length,
      groups:        analyzed.filter(p => p.analysis?.isGroupPhoto).length,
      landscapes:    analyzed.filter(p => p.analysis?.isLandscape).length,
      blackAndWhite: analyzed.filter(p => p.analysis?.isBlackAndWhite).length,
      colorGraded:   analyzed.filter(p => p.analysis?.isColorGraded).length,
      wedding:       analyzed.filter(p => p.analysis?.isWedding).length,
      nightShots:    analyzed.filter(p => p.analysis?.isNight).length,
      indoor:        analyzed.filter(p => p.analysis?.isIndoor).length,
      outdoor:       analyzed.filter(p => p.analysis?.isIndoor === false).length,
      noisy:         analyzed.filter(p => p.analysis?.noise?.isNoisy).length,
      avgScore:      analyzed.length ? Math.round(analyzed.reduce((s, p) => s + p.aiScore, 0) / analyzed.length) : 0,
      analyzedWith: {
        cloudinary: analyzed.filter(p => p.analysis?.analyzedWith?.includes('cloudinary')).length,
        sharpOnly:  analyzed.filter(p => p.analysis?.analyzedWith === 'sharp-only').length,
      },
    },
    progress: { analyzed: analyzed.length, total: photos.length },
  });
};

exports.getDuplicates = async (req, res) => {
  const { projectId } = req.params;
  const photos = await Photo.find({ projectId, duplicateGroupId: { $ne: null }, status: { $ne: 'deleted' } }).lean();
  const groups = {};
  for (const p of photos) {
    if (!groups[p.duplicateGroupId]) groups[p.duplicateGroupId] = [];
    groups[p.duplicateGroupId].push(p);
  }
  const duplicateGroups = Object.entries(groups)
    .filter(([, ps]) => ps.length > 1)
    .map(([groupId, ps]) => ({
      groupId,
      photos:    ps.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0)),
      bestPhoto: ps.find(p => p.isBestInGroup) || ps[0],
      count:     ps.length,
    }));
  return successResponse(res, { duplicateGroups, totalGroups: duplicateGroups.length });
};
