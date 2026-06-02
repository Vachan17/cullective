const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { analyzePhoto, generatePHash, comparePHash } = require('./aiAnalysisService');
const Photo = require('../models/Photo');
const Project = require('../models/Project');
const { buildSystemCollections } = require('./collectionService');
const ActivityLog = require('../models/ActivityLog');

const SUPPORTED_EXTS = new Set(['.jpg','.jpeg','.png','.webp','.tiff','.tif','.bmp','.gif','.heic','.heif','.cr2','.nef','.arw','.dng','.raf']);

/**
 * Scan a local folder path, analyze each image with Sharp,
 * store metadata + thumbnail in MongoDB.
 * NO Cloudinary upload — originals stay on disk.
 */
const scanLocalFolder = async (folderPath, projectId, userId, onProgress) => {
  if (!fs.existsSync(folderPath)) throw new Error(`Folder not found: ${folderPath}`);

  const allFiles = getAllImages(folderPath);
  if (!allFiles.length) throw new Error('No supported image files found in this folder');

  const project = await Project.findById(projectId);
  if (!project) throw new Error('Project not found');

  project.status = 'analyzing';
  await project.save();

  const hashes = [];
  const existingPhotos = await Photo.find({ projectId });
  for (const p of existingPhotos) {
    if (p.pHash && p.duplicateGroupId) {
      hashes.push({ hash: p.pHash, groupId: p.duplicateGroupId });
    }
  }

  let processed = 0;
  let imported = 0;
  let skipped = 0;

  for (const filePath of allFiles) {
    const current = path.basename(filePath);
    onProgress?.({ processed, total: allFiles.length, current, status: 'processing' });

    try {
      const existingPhoto = await Photo.findOne({ projectId, url: filePath });
      if (existingPhoto) {
        skipped++;
        continue;
      }

      const stat = fs.statSync(filePath);
      const buffer = fs.readFileSync(filePath);
      const meta = await sharp(buffer).metadata();

      // Generate a data-URL thumbnail (base64, ~400px wide) stored in DB
      const thumbBuffer = await sharp(buffer)
        .rotate()
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
      const thumbDataUrl = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;

      // AI analysis
      const result = await analyzePhoto(buffer, null, project.shootType); // local file — no Cloudinary AI

      // Duplicate detection
      let isDuplicate = false, duplicateGroupId = null;
      if (result.pHash) {
        for (const prev of hashes) {
          if (comparePHash(result.pHash, prev.hash) >= 80) {
            isDuplicate = true;
            duplicateGroupId = prev.groupId;
            break;
          }
        }
        if (!isDuplicate) {
          duplicateGroupId = `${projectId}_${processed}`;
          hashes.push({ hash: result.pHash, groupId: duplicateGroupId });
        }
        result.analysis.isDuplicate = isDuplicate;
      }

      await Photo.create({
        projectId,
        userId,
        filename: path.basename(filePath),
        originalName: path.basename(filePath),
        cloudinaryId: `local:${filePath}`,   // marks as local
        url: filePath,                         // absolute local path
        thumbnailUrl: thumbDataUrl,            // inline base64 thumb
        width: meta.width,
        height: meta.height,
        fileSize: stat.size,
        format: meta.format,
        status: 'analyzed',
        aiScore: result.aiScore,
        aiTags: result.aiTags,
        pHash: result.pHash,
        analysis: result.analysis,
        duplicateGroupId,
        analyzedAt: new Date(),
        metadata: {
          takenAt: stat.mtime,
        },
      });

      await Project.findByIdAndUpdate(projectId, { $inc: { totalPhotos: 1, analyzedPhotos: 1 } });
      imported++;
    } catch (err) {
      skipped++;
      console.error(`Skipped ${filePath}: ${err.message}`);
    } finally {
      processed++;
      onProgress?.({
        processed,
        total: allFiles.length,
        current,
        status: 'processed',
        imported,
        skipped,
      });
    }
  }

  // Mark best in duplicate groups
  const allPhotos = await Photo.find({ projectId });
  const groups = {};
  for (const p of allPhotos) {
    if (p.duplicateGroupId) {
      if (!groups[p.duplicateGroupId] || p.aiScore > (groups[p.duplicateGroupId].score || 0))
        groups[p.duplicateGroupId] = { id: p._id, score: p.aiScore };
    }
  }
  for (const best of Object.values(groups))
    await Photo.findByIdAndUpdate(best.id, { isBestInGroup: true });

  const analyzed = await Photo.find({ projectId, aiScore: { $ne: null } });
  await Project.findByIdAndUpdate(projectId, {
    status: 'ready',
    duplicatesCount: analyzed.filter(p => p.analysis?.isDuplicate).length,
    bestPicksCount: analyzed.filter(p => p.aiScore >= 80).length,
    totalSize: analyzed.reduce((s, p) => s + (p.fileSize || 0), 0),
  });

  await buildSystemCollections(projectId, userId);
  await ActivityLog.create({ userId, projectId, action: 'analysis_completed', count: imported });

  return { processed, imported, skipped, total: allFiles.length };
};

const getAllImages = (dir) => {
  const results = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d)) {
      const full = path.join(d, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (SUPPORTED_EXTS.has(path.extname(entry).toLowerCase())) results.push(full);
    }
  };
  walk(dir);
  return results;
};

module.exports = { scanLocalFolder, getAllImages, SUPPORTED_EXTS };
