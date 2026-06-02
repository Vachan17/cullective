/**
 * aiAnalysisService.js
 *
 * This now delegates ALL analysis to cloudinaryAnalysis.js which uses:
 *   - Cloudinary AI API  → real face detection, eye detection, quality scoring, scene tags
 *   - Sharp              → blur (Laplacian), exposure (histogram), noise, pHash
 *
 * The old heuristic Sharp-only code is gone. Results are now actually accurate.
 */

const { analyzePhotoFull, comparePHash, getPHash, getSharpnessScore, getExposureScore } = require('./cloudinaryAnalysis');
const { analyzePhotoWithGemini } = require('./geminiAnalysis');

// Main export — used by analysisController + localScanService + photoController
const analyzePhoto = async (imageBuffer, cloudinaryId = null, shootType = null) => {
  if (process.env.GEMINI_API_KEY?.trim()) {
    try {
      return await analyzePhotoWithGemini(imageBuffer, cloudinaryId, shootType);
    } catch (err) {
      console.error('Gemini analysis failed, falling back to Cloudinary/Sharp:', err.message);
    }
  }
  return analyzePhotoFull(imageBuffer, cloudinaryId, shootType);
};

module.exports = {
  analyzePhoto,
  analyzePhotoFull,
  comparePHash,
  generatePHash: getPHash,
  analyzeSharpness: getSharpnessScore,
  analyzeExposure: getExposureScore,
};
