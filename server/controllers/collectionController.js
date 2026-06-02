const Collection = require('../models/Collection');
const Photo = require('../models/Photo');
const { buildSystemCollections } = require('../services/collectionService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const fs = require('fs');
const path = require('path');

function toContainerPath(inputPath) {
  if (!inputPath) return inputPath;
  const unquoted = String(inputPath).trim().replace(/^["']|["']$/g, '');
  const driveMatch = unquoted.match(/^([A-Za-z]):[\\\/](.*)/);
  if (driveMatch) {
    const driveLetter = driveMatch[1].toLowerCase();
    const rest = driveMatch[2].replace(/\\/g, '/');
    return `/host/${driveLetter}/${rest}`;
  }
  return unquoted;
}

function safeFolderName(name) {
  return String(name || 'Collection')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Collection';
}

function uniqueDestination(dir, filename) {
  const parsed = path.parse(filename);
  let target = path.join(dir, filename);
  let n = 1;
  while (fs.existsSync(target)) {
    target = path.join(dir, `${parsed.name}-${n}${parsed.ext}`);
    n++;
  }
  return target;
}

exports.getCollections = async (req, res) => {
  const { projectId } = req.params;
  const collections = await Collection.find({ projectId, userId: req.user._id }).sort('name');
  return successResponse(res, { collections });
};

exports.createCollection = async (req, res) => {
  const { name, description, projectId, icon, color } = req.body;
  const collection = await Collection.create({
    name, description, projectId, icon, color,
    userId: req.user._id, type: 'manual', category: 'custom',
  });
  return successResponse(res, { collection }, 'Collection created', 201);
};

exports.addPhotosToCollection = async (req, res) => {
  const { photoIds, action = 'add' } = req.body;
  const collection = await Collection.findOne({ _id: req.params.id, userId: req.user._id });
  if (!collection) return errorResponse(res, 'Collection not found', 404);

  if (action === 'add') {
    const newIds = photoIds.filter(id => !collection.photos.map(String).includes(String(id)));
    collection.photos.push(...newIds);
  } else {
    collection.photos = collection.photos.filter(id => !photoIds.map(String).includes(String(id)));
  }

  collection.photoCount = collection.photos.length;
  await collection.save();

  await Photo.updateMany(
    { _id: { $in: photoIds } },
    action === 'add'
      ? { $addToSet: { collections: collection._id } }
      : { $pull: { collections: collection._id } }
  );

  return successResponse(res, { collection }, 'Collection updated');
};

exports.rebuildSystemCollections = async (req, res) => {
  const { projectId } = req.params;
  const collections = await buildSystemCollections(projectId, req.user._id);
  return successResponse(res, { collections }, 'Collections rebuilt');
};

exports.deleteCollection = async (req, res) => {
  const collection = await Collection.findOne({ _id: req.params.id, userId: req.user._id });
  if (!collection) return errorResponse(res, 'Collection not found', 404);
  if (collection.isSystem) return errorResponse(res, 'Cannot delete system collections', 403);
  await collection.deleteOne();
  return successResponse(res, null, 'Collection deleted');
};

exports.exportLocalCollections = async (req, res) => {
  const { projectId } = req.params;
  const destinationPath = toContainerPath(req.body.destinationPath);
  if (!destinationPath) return errorResponse(res, 'destinationPath required', 400);

  fs.mkdirSync(destinationPath, { recursive: true });

  const collections = await Collection.find({ projectId, userId: req.user._id }).sort('name').lean();
  const summary = [];
  let copiedTotal = 0;
  let skippedTotal = 0;

  for (const collection of collections) {
    const folder = path.join(destinationPath, safeFolderName(collection.name));
    fs.mkdirSync(folder, { recursive: true });

    const photos = await Photo.find({
      _id: { $in: collection.photos || [] },
      userId: req.user._id,
      status: { $ne: 'deleted' },
    }).lean();

    let copied = 0;
    let skipped = 0;
    for (const photo of photos) {
      const source = toContainerPath(photo.url);
      if (!photo.cloudinaryId?.startsWith('local:') || !source || !fs.existsSync(source)) {
        skipped++;
        continue;
      }

      const target = uniqueDestination(folder, photo.originalName || path.basename(source));
      fs.copyFileSync(source, target);
      copied++;
    }

    copiedTotal += copied;
    skippedTotal += skipped;
    summary.push({ collection: collection.name, folder, copied, skipped });
  }

  return successResponse(res, {
    destinationPath,
    copied: copiedTotal,
    skipped: skippedTotal,
    collections: summary,
  }, 'Local collection folders exported');
};
