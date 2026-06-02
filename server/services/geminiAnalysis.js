const axios = require('axios');
const sharp = require('sharp');
const logger = require('../utils/logger');
const { extractExif } = require('./01_exifService');
const {
  comparePHash,
  getPHash,
  getSharpnessScore,
  getExposureScore,
  getNoiseScore,
  detectBW,
  getDominantColorsFromBuffer
} = require('./cloudinaryAnalysis');

let lastRequestPromise = Promise.resolve();

const analyzePhotoWithGemini = async (imageBuffer, cloudinaryId = null, shootType = null) => {
  // Queue requests to stay within Gemini free tier 15 RPM limit (1 request every 4 seconds)
  const result = await new Promise((resolve, reject) => {
    lastRequestPromise = lastRequestPromise
      .then(async () => {
        try {
          const res = await executeGeminiRequest(imageBuffer, cloudinaryId, shootType);
          resolve(res);
        } catch (err) {
          reject(err);
        }
        // Enforce 4.2 seconds gap between requests
        await new Promise(r => setTimeout(r, 4200));
      })
      .catch(async () => {
        // Enforce gap even if the promise failed for some reason
        await new Promise(r => setTimeout(r, 4200));
      });
  });
  return result;
};

const executeGeminiRequest = async (imageBuffer, cloudinaryId = null, shootType = null) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  // 1. Run local Sharp metrics first (Fast and 100% accurate for mathematical properties)
  const meta = await sharp(imageBuffer).metadata().catch(() => ({ width: 800, height: 600 }));
  const { width = 800, height = 600 } = meta;

  const exif = await extractExif(imageBuffer).catch(() => null);
  const orientation = exif?.orientation || 1;
  const isRotated = orientation >= 5 && orientation <= 8;
  const displayWidth = isRotated ? height : width;
  const displayHeight = isRotated ? width : height;
  const ar = displayWidth / displayHeight;

  const [sharpness, exposure, noise, bw, pHash, dominantColors] = await Promise.all([
    getSharpnessScore(imageBuffer),
    getExposureScore(imageBuffer),
    getNoiseScore(imageBuffer),
    detectBW(imageBuffer),
    getPHash(imageBuffer),
    getDominantColorsFromBuffer(imageBuffer)
  ]);

  // 2. Downscale image for Gemini to save bandwidth and speed up request
  const lowResBuffer = await sharp(imageBuffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  const base64Image = lowResBuffer.toString('base64');

  // 3. Prompt Gemini for semantic analysis
  const prompt = `Analyze this photograph. You are an expert photo editor and AI assistant.
Evaluate the image content, subjects, composition, and aesthetic quality.

Return a JSON object that strictly adheres to the following structure. Do not wrap the JSON in markdown code blocks like \`\`\`json \`\`\`, just return the raw JSON string.

{
  "faceCount": number, // number of human faces clearly visible in the image. Be precise.
  "eyesOpen": boolean or null, // true if eyes are open for all detected faces, false if any detected faces have closed/blinking eyes, null if faceCount is 0.
  "isIndoor": boolean, // true if the scene is indoors, false if outdoors.
  "isLandscape": boolean, // true if it is a landscape/nature/outdoor scenery shot, false otherwise.
  "isWedding": boolean, // true if the photo contains wedding elements (bride, groom, wedding dress, ceremony, reception), false otherwise.
  "isNight": boolean, // true if the photo is taken at night or in very dark environments, false otherwise.
  "sceneTags": string[], // 3-8 tags describing the contents (e.g. ["sunset", "beach", "candid", "portrait", "architecture", "food", "party"]). Keep tags lowercase and hyphenated if multiple words.
  "aiScore": number, // an aesthetic quality score between 0 and 100 based on composition, lighting, framing, and emotional appeal.
  "recommendations": Array of objects like:
    {
      "issue": string, // e.g. "Centering", "Horizon Line", "Soft Focus", "Color Balance"
      "severity": "low" | "medium" | "high",
      "suggestedFix": string, // e.g. "Crop slightly to center the subject", "Rotate by 1.2 degrees to level the horizon"
      "params": Object // optional editing parameters in Lightroom notation, e.g. {"Contrast": "+5", "Highlights": "-10"}
    }
}`;

  logger.info('Calling Gemini API for semantic image analysis...');

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    },
    { timeout: 20000 }
  );

  const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error('Empty response from Gemini API');
  }

  // Parse Gemini response
  let geminiData;
  try {
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
    }
    cleanText = cleanText.replace(/^`+/, '').replace(/`+$/, '').trim();
    geminiData = JSON.parse(cleanText);
  } catch (err) {
    logger.warn('Failed to parse Gemini response as JSON. Raw text: ' + responseText);
    throw new Error('Invalid JSON format returned from Gemini API: ' + err.message);
  }

  // Ensure fields have defaults if Gemini skipped them or returned incorrect types
  const faces = typeof geminiData.faceCount === 'number' ? geminiData.faceCount : 0;
  const eyesOpen = typeof geminiData.eyesOpen === 'boolean' ? geminiData.eyesOpen : null;
  const isIndoor = typeof geminiData.isIndoor === 'boolean' ? geminiData.isIndoor : false;
  const isLandscape = typeof geminiData.isLandscape === 'boolean' ? geminiData.isLandscape : false;
  const isWedding = typeof geminiData.isWedding === 'boolean' ? geminiData.isWedding : (shootType === 'wedding');
  const isNight = typeof geminiData.isNight === 'boolean' ? geminiData.isNight : false;
  const rawSceneTags = Array.isArray(geminiData.sceneTags) ? geminiData.sceneTags : [];
  const geminiScore = typeof geminiData.aiScore === 'number' ? geminiData.aiScore : 70;

  // Build the final analysis structure
  const analysis = {
    sharpness: { score: sharpness.score, label: sharpness.label },
    exposure: { score: exposure.score, label: exposure.label, ev: exposure.ev },
    noise: { score: noise.score, label: noise.label, isNoisy: noise.isNoisy },
    composition: {
      score: geminiScore,
      label: geminiScore > 75 ? 'Excellent' : geminiScore > 55 ? 'Good' : geminiScore > 35 ? 'Average' : 'Poor',
      cloudinaryQuality: null
    },
    faceCount: faces,
    eyesOpen: eyesOpen,
    isBlurry: sharpness.isBlurry,
    isDuplicate: false,
    isUnderexposed: exposure.isUnderexposed,
    isOverexposed: exposure.isOverexposed,
    isPortrait: faces === 1,
    isCouplePhoto: faces === 2,
    isGroupPhoto: faces >= 3,
    isLandscape: isLandscape || (!displayHeight || (!(displayHeight > displayWidth) && ar > 1.2)),
    isBlackAndWhite: bw,
    isColorGraded: !bw && dominantColors.length > 0 && dominantColors[0].percentage > 40,
    isWedding,
    isIndoor,
    isNight,
    dominantColors,
    confidence: 95,
    analyzedWith: 'gemini+sharp',
    recommendations: Array.isArray(geminiData.recommendations) ? geminiData.recommendations.map(r => ({
      issue: r.issue || 'Editing adjustment',
      severity: ['low', 'medium', 'high'].includes(r.severity) ? r.severity : 'medium',
      suggestedFix: r.suggestedFix || 'Apply standard photo enhancement',
      params: r.params || {}
    })) : []
  };

  // Compile smart tags list (uniquely merged)
  const aiTags = [];
  if (analysis.isBlurry) aiTags.push('blurry');
  if (analysis.isUnderexposed) aiTags.push('underexposed');
  if (analysis.isOverexposed) aiTags.push('overexposed');
  if (analysis.isPortrait) aiTags.push('solo');
  if (analysis.isCouplePhoto) aiTags.push('couple');
  if (analysis.isGroupPhoto) aiTags.push('group');
  if (analysis.isLandscape) aiTags.push('landscape');
  if (analysis.isBlackAndWhite) aiTags.push('black-and-white');
  if (analysis.isColorGraded) aiTags.push('color-graded');
  if (analysis.isIndoor) aiTags.push('indoor');
  if (!analysis.isIndoor) aiTags.push('outdoor');
  if (analysis.isWedding) aiTags.push('wedding');
  if (analysis.isNight) aiTags.push('night');
  if (analysis.eyesOpen === false) aiTags.push('closed-eyes');
  if (noise.isNoisy) aiTags.push('noisy');
  if (geminiScore >= 85) aiTags.push('best-pick');
  if (geminiScore >= 90 && !analysis.isBlurry) aiTags.push('instagram-worthy');

  // Add clean formatted tags from Gemini
  rawSceneTags.forEach(tag => {
    const cleanTag = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (cleanTag && !aiTags.includes(cleanTag)) {
      aiTags.push(cleanTag);
    }
  });

  return {
    analysis,
    aiScore: geminiScore,
    aiTags,
    pHash,
    dimensions: { width, height }
  };
};

module.exports = { analyzePhotoWithGemini };
