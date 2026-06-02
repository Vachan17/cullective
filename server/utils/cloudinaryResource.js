const cloudinary = require('../config/cloudinary');

function pickNumber(v) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Fetch authoritative asset details from Cloudinary by `public_id`.
 *
 * Returns a normalized object that maps cleanly onto our Photo schema.
 */
async function fetchCloudinaryImageDetails(cloudinaryId) {
  if (!cloudinaryId) return null;

  // Cloudinary Admin API expects a public_id. If local uploads are marked with
  // a prefix (e.g., local:...), we can't fetch remote details.
  if (String(cloudinaryId).startsWith('local:')) return null;

  const publicId = String(cloudinaryId).trim();

  // `resource` includes fields like: width, height, format, bytes, secure_url, etc.
  const resource = await cloudinary.api.resource(publicId, {
    resource_type: 'image',
  });

  if (!resource || typeof resource !== 'object') return null;

  return {
    width: pickNumber(resource.width),
    height: pickNumber(resource.height),
    format: resource.format ? String(resource.format) : undefined,
    fileSize: pickNumber(resource.bytes),
    url: resource.secure_url ? String(resource.secure_url) : undefined,
    // Keep cloudinaryId/publicId normalized
    cloudinaryId: resource.public_id ? String(resource.public_id) : publicId,
  };
}

module.exports = {
  fetchCloudinaryImageDetails,
};

