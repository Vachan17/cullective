const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Photo = require('./models/Photo');
const Project = require('./models/Project');
const { analyzePhoto, comparePHash } = require('./services/aiAnalysisService');
const { buildSystemCollections } = require('./services/collectionService');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/cullective');
  console.log('Connected!');

  const projects = await Project.find({ totalPhotos: { $gt: 0 } });
  console.log(`Found ${projects.length} populated projects to re-analyze.`);

  for (const project of projects) {
    console.log(`\n======================================================`);
    console.log(`Re-analyzing project: ${project.name} (${project._id})`);
    console.log(`======================================================`);

    const photos = await Photo.find({ projectId: project._id });
    console.log(`Found ${photos.length} photos.`);

    const hashes = [];
    let done = 0;

    for (const photo of photos) {
      try {
        let buffer;
        if (photo.cloudinaryId?.startsWith('local:')) {
          let absolutePath = path.resolve(photo.url);
          if (process.platform === 'win32') {
            absolutePath = absolutePath.replace(/^[a-zA-Z]:\\host\\([a-zA-Z])\\/i, '$1:\\')
                                       .replace(/^\/host\/([a-zA-Z])\//i, '$1:\\')
                                       .replace(/\\host\\([a-zA-Z])\\/gi, '$1:\\')
                                       .replace(/\/host\/([a-zA-Z])\//gi, '$1:/');
          }
          buffer = fs.readFileSync(absolutePath);
        } else {
          console.log(`Skipping non-local photo: ${photo.originalName}`);
          continue;
        }

        console.log(`Processing: ${photo.originalName}...`);
        const result = await analyzePhoto(buffer, null, project.shootType);

        // Duplicate detection
        let isDuplicate = false, duplicateGroupId = photo.duplicateGroupId;
        if (result.pHash) {
          for (const prev of hashes) {
            if (comparePHash(result.pHash, prev.hash) >= 80) {
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

        // Regenerate properly oriented thumbnail
        let thumbDataUrl = photo.thumbnailUrl;
        try {
          const thumbBuffer = await sharp(buffer)
            .rotate()
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toBuffer();
          thumbDataUrl = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;
        } catch (err) {
          console.warn(`Failed to generate rotated thumbnail for ${photo.originalName}: ${err.message}`);
        }

        await Photo.findByIdAndUpdate(photo._id, {
          status: 'analyzed',
          aiScore: result.aiScore,
          aiTags: result.aiTags,
          pHash: result.pHash,
          analysis: result.analysis,
          duplicateGroupId,
          thumbnailUrl: thumbDataUrl,
          analyzedAt: new Date(),
        });
        done++;
      } catch (err) {
        console.error(`Failed to analyze ${photo.originalName}: ${err.message}`);
      }
    }

    // Best-in-group pass
    const groups = {};
    const allP = await Photo.find({ projectId: project._id });
    for (const p of allP) {
      if (p.duplicateGroupId && (!groups[p.duplicateGroupId] || p.aiScore > (groups[p.duplicateGroupId].score || 0))) {
        groups[p.duplicateGroupId] = { id: p._id, score: p.aiScore };
      }
    }
    for (const best of Object.values(groups)) {
      await Photo.findByIdAndUpdate(best.id, { isBestInGroup: true });
    }

    const analyzed = await Photo.find({ projectId: project._id, aiScore: { $ne: null } });
    await Project.findByIdAndUpdate(project._id, {
      status: 'ready',
      analyzedPhotos: done,
      duplicatesCount: analyzed.filter(p => p.analysis?.isDuplicate).length,
      bestPicksCount: analyzed.filter(p => p.aiScore >= 80).length,
      totalSize: analyzed.reduce((s, p) => s + (p.fileSize || 0), 0),
    });

    console.log(`Rebuilding collections for ${project.name}...`);
    await buildSystemCollections(project._id, project.userId);
    console.log(`Analysis complete for project ${project.name}!`);
  }

  console.log('\nAll projects successfully re-analyzed!');
  process.exit(0);
}

run().catch(console.error);
