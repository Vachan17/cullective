const { scanLocalFolder, getAllImages, SUPPORTED_EXTS } = require('../services/localScanService');
const Project = require('../models/Project');
const Photo   = require('../models/Photo');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const path = require('path');
const fs   = require('fs');

// Handle both Windows paths (C:\...) and Unix paths
const normalizePath = (p) => {
  if (!p) return p;
  // Docker host mount: C:\Users\... → /host/c/Users/...
  const drive = p.match(/^([A-Za-z]):[\\\/](.*)/);
  if (drive) return `/host/${drive[1].toLowerCase()}/${drive[2].replace(/\\/g, '/')}`;
  return p.replace(/\\/g, '/');
};

exports.browseFolder = async (req, res) => {
  const raw = req.query.dir;
  const dir = normalizePath(raw) || '/host/c/Users';
  if (!fs.existsSync(dir)) return errorResponse(res, `Folder not found: ${dir}`, 404);
  if (!fs.statSync(dir).isDirectory()) return errorResponse(res, 'Not a directory', 400);

  const entries = fs.readdirSync(dir).map(name => {
    const full = path.join(dir, name);
    try {
      const s   = fs.statSync(full);
      const ext = path.extname(name).toLowerCase();
      return { name, path: full, isDir: s.isDirectory(), isImage: SUPPORTED_EXTS.has(ext), size: s.size };
    } catch { return null; }
  }).filter(Boolean).sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));

  return successResponse(res, {
    dir, parent: dir !== path.dirname(dir) ? path.dirname(dir) : null,
    entries, imageCount: entries.filter(e => e.isImage).length,
  });
};

exports.countFolder = async (req, res) => {
  const dir = normalizePath(req.query.dir);
  if (!dir || !fs.existsSync(dir)) return errorResponse(res, 'Folder not found', 404);
  return successResponse(res, { count: getAllImages(dir).length, dir });
};

exports.startScan = async (req, res) => {
  const { projectId } = req.body;
  const folderPath = normalizePath(req.body.folderPath);
  if (!projectId || !folderPath) return errorResponse(res, 'projectId and folderPath required', 400);

  const project = await Project.findOne({ _id: projectId, userId: req.user._id });
  if (!project) return errorResponse(res, 'Project not found', 404);
  if (!fs.existsSync(folderPath)) return errorResponse(res, `Folder not found: ${folderPath}`, 404);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (d) => res.write(`data: ${JSON.stringify(d)}\n\n`);

  try {
    const files = getAllImages(folderPath);
    send({ type: 'start', total: files.length });

    await scanLocalFolder(folderPath, projectId, req.user._id, ({ processed, total, current }) => {
      send({ type: 'progress', processed, total, current, percent: Math.round((processed / total) * 100) });
    });

    send({ type: 'done', message: `Scanned ${files.length} photos` });
  } catch (err) {
    send({ type: 'error', message: err.message });
  } finally {
    res.end();
  }
};

// ── FIXED: reliable status polling ───────────────────────────────────────────
exports.getScanStatus = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, userId: req.user._id });
  if (!project) return errorResponse(res, 'Not found', 404);

  const [totalInDB, analyzedCount, pendingCount] = await Promise.all([
    Photo.countDocuments({ projectId: project._id, status: { $ne: 'deleted' } }),
    Photo.countDocuments({ projectId: project._id, aiScore: { $ne: null }, status: { $ne: 'deleted' } }),
    Photo.countDocuments({ projectId: project._id, status: { $in: ['pending', 'analyzing'] } }),
  ]);

  // Auto-recover if stuck: no pending/analyzing but project still says analyzing
  if (project.status === 'analyzing' && pendingCount === 0 && totalInDB > 0) {
    await Project.findByIdAndUpdate(project._id, { status: 'ready', analyzedPhotos: analyzedCount });
    project.status = 'ready';
  }

  const total = Math.max(project.totalPhotos || 0, totalInDB);
  const percent = total > 0 ? Math.round((analyzedCount / total) * 100) : 0;

  return successResponse(res, { status: project.status, total, analyzed: analyzedCount, pending: pendingCount, percent });
};
