const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const projectId = req.params.projectId || req.body.projectId || 'general';
    return {
      folder: `cullective/${req.user.id}/${projectId}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'raw', 'cr2', 'nef', 'arw'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      resource_type: 'image',
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/tiff', 'image/x-raw',
  ];
  if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not supported`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 100, // max 100 files per request
  },
});

// Local disk storage (for processing before Cloudinary)
const localUpload = multer({
  dest: '/tmp/cullective-uploads/',
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = { upload, localUpload };
