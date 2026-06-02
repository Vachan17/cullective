/**
 * cloudinaryAnalysis.js — uses ONLY free Cloudinary features + Sharp
 *
 * FREE Cloudinary features used:
 *   - faces: true         → face bounding boxes (count, positions) — 100% free
 *   - colors: true        → dominant color palette — 100% free
 *   - image_analysis:true → quality_analysis score (free, enable in Cloudinary dashboard → Add-ons → free tier)
 *   - phash: true         → Cloudinary's own perceptual hash — free
 *
 * REMOVED (paid add-ons):
 *   - detection: 'adv_face'         → requires paid add-on ($)
 *   - categorization: 'google_tagging' → requires paid add-on ($)
 *
 * Sharp (completely free, runs locally):
 *   - Blur / sharpness (Laplacian variance)
 *   - Exposure (luminance histogram)
 *   - Noise (blur-diff)
 *   - pHash (8×8 grayscale average hash)
 *   - B&W detection (channel diff)
 *   - Eye detection (dark-band analysis on face region from Cloudinary bounding box)
 *   - Skin-tone face estimation (fallback when Cloudinary fails)
 */

const cloudinary = require('../config/cloudinary');
const sharp = require('sharp');
const logger = require('../utils/logger');
const { extractExif } = require('./01_exifService');

// ── Timeout wrapper ────────────────────────────────────────────────────────────
const withTimeout = (promise, ms, fallback) =>
  Promise.race([promise, new Promise(res => setTimeout(() => res(fallback), ms))]);

// ── Sharp pixel utilities ──────────────────────────────────────────────────────

const getSharpnessScore = async (buf) => {
  try {
    const { data } = await sharp(buf)
      .greyscale()
      .resize(400, 400, { fit: 'inside' })
      .convolve({
        width: 3,
        height: 3,
        kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0]
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let sum = 0, sq = 0;
    for (const v of data) { sum += v; sq += v * v; }
    const variance = (sq / data.length) - Math.pow(sum / data.length, 2);
    // Scale standard deviation of Laplacian response (typical range 1-20+) to a 0-100 score
    const stdDev = Math.sqrt(variance);
    const score = Math.min(100, Math.max(0, Math.round(stdDev * 8)));
    return { score, isBlurry: score < 30, label: score > 75 ? 'Sharp' : score > 50 ? 'Acceptable' : score > 25 ? 'Soft' : 'Blurry' };
  } catch { return { score: 50, isBlurry: false, label: 'Unknown' }; }
};

const getExposureScore = async (buf) => {
  try {
    const stats = await sharp(buf).stats();
    const lum = (stats.channels.reduce((s, c) => s + c.mean, 0) / stats.channels.length / 255) * 100;
    const isUnder = lum < 22, isOver = lum > 88;
    return {
      score: Math.round(lum),
      label: isUnder ? 'Underexposed' : isOver ? 'Overexposed' : 'Good',
      isUnderexposed: isUnder,
      isOverexposed: isOver,
      ev: isUnder ? +((22 - lum) / 10).toFixed(1) : isOver ? -((lum - 88) / 10).toFixed(1) : 0,
    };
  } catch { return { score: 50, label: 'Unknown', isUnderexposed: false, isOverexposed: false, ev: 0 }; }
};

const getNoiseScore = async (buf) => {
  try {
    const { data: o } = await sharp(buf).greyscale().resize(200, 200, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
    const { data: b } = await sharp(buf).greyscale().resize(200, 200, { fit: 'inside' }).blur(2).raw().toBuffer({ resolveWithObject: true });
    let d = 0; for (let i = 0; i < o.length; i++) d += Math.abs(o[i] - b[i]);
    const score = Math.max(0, Math.min(100, Math.round(100 - (d / o.length) * 4)));
    return { score, isNoisy: score < 45, label: score > 80 ? 'Clean' : score > 60 ? 'Low' : score > 40 ? 'Moderate' : 'Noisy' };
  } catch { return { score: 65, isNoisy: false, label: 'Unknown' }; }
};

const getPHash = async (buf) => {
  try {
    const { data } = await sharp(buf).greyscale().resize(8, 8, { fit: 'fill', kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
    const avg = data.reduce((s, v) => s + v, 0) / data.length;
    return Array.from(data).map(v => v > avg ? '1' : '0').join('');
  } catch { return null; }
};

const detectBW = async (buf) => {
  try {
    const s = await sharp(buf).stats();
    if (s.channels.length < 3) return true;
    const [r, g, b] = s.channels;
    return (Math.abs(r.mean - g.mean) + Math.abs(g.mean - b.mean) + Math.abs(r.mean - b.mean)) / 3 < 8;
  } catch { return false; }
};

const getDominantColorsFromBuffer = async (buf) => {
  try {
    const { data, info } = await sharp(buf).resize(50, 50, { fit: 'cover' }).raw().toBuffer({ resolveWithObject: true });
    const map = {};
    for (let i = 0; i < data.length; i += info.channels) {
      const r = Math.min(255, Math.max(0, Math.round(data[i]/32)*32));
      const g = Math.min(255, Math.max(0, Math.round(data[i+1]/32)*32));
      const b = Math.min(255, Math.max(0, Math.round(data[i+2]/32)*32));
      const k = `${r},${g},${b}`;
      map[k] = (map[k] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => ({
      color: '#' + c.split(',').map(v => parseInt(v).toString(16).padStart(2, '0')).join(''),
      percentage: Math.round((n / (info.width * info.height)) * 100),
    }));
  } catch { return []; }
};

/**
 * Eye-openness detection using Sharp on the face region.
 * Uses Cloudinary face bounding boxes (free) to crop the eye area,
 * then counts dark horizontal bands (open eyes = more dark bands).
 */
const detectEyesFromFaceBox = async (buf, faceBox, imgWidth, imgHeight) => {
  try {
    const { left, top, width, height } = faceBox;
    // Eye region is roughly the top 55% of face, middle 80% horizontally
    const eyeLeft   = Math.max(0, Math.round((left + width * 0.10) * imgWidth));
    const eyeTop    = Math.max(0, Math.round((top + height * 0.20) * imgHeight));
    const eyeWidth  = Math.min(imgWidth  - eyeLeft, Math.round(width * 0.80 * imgWidth));
    const eyeHeight = Math.min(imgHeight - eyeTop,  Math.round(height * 0.35 * imgHeight));

    if (eyeWidth < 10 || eyeHeight < 5) return null;

    const { data, info } = await sharp(buf)
      .extract({ left: eyeLeft, top: eyeTop, width: eyeWidth, height: eyeHeight })
      .greyscale().resize(60, 20, { fit: 'fill' }).raw()
      .toBuffer({ resolveWithObject: true });

    // Count dark horizontal bands (open eyes have dark iris/pupil bands)
    let darkRows = 0;
    for (let r = 0; r < info.height; r++) {
      let darkPixels = 0;
      for (let c = 0; c < info.width; c++) {
        if (data[r * info.width + c] < 80) darkPixels++;
      }
      if (darkPixels / info.width > 0.15) darkRows++;
    }
    // Open eyes: ≥ 25% of rows have dark bands
    return darkRows / info.height >= 0.25;
  } catch { return null; }
};

// ── Cloudinary free API call ───────────────────────────────────────────────────
const getCloudinaryResource = async (cloudinaryId) => {
  try {
    const result = await withTimeout(
      cloudinary.api.resource(cloudinaryId, {
        image_analysis: true,  // quality score — free (enable add-on in Cloudinary dashboard, it's free)
        faces: true,           // face bounding boxes — always free
        colors: true,          // dominant colors — always free
      }),
      8000,  // 8 second timeout — if Cloudinary doesn't respond, skip
      null
    );
    return result;
  } catch (err) {
    logger.warn(`Cloudinary resource fetch failed for ${cloudinaryId}: ${err.message}`);
    return null;
  }
};

// ── Master analysis ────────────────────────────────────────────────────────────
const analyzePhotoFull = async (buf, cloudinaryId = null, shootType = null) => {
  const meta = await sharp(buf).metadata().catch(() => ({ width: 800, height: 600 }));
  const { width = 800, height = 600 } = meta;

  // Extract EXIF metadata
  const exif = await extractExif(buf).catch(() => null);
  const orientation = exif?.orientation || 1;
  const isRotated = orientation >= 5 && orientation <= 8; // Rotated 90 or 270 degrees

  // Swap width and height for display/aspect ratio if rotated by EXIF
  const displayWidth = isRotated ? height : width;
  const displayHeight = isRotated ? width : height;
  const ar = displayWidth / displayHeight;

  // Run all Sharp analyses in parallel
  const [sharpness, exposure, noise, bw, pHash] = await Promise.all([
    getSharpnessScore(buf),
    getExposureScore(buf),
    getNoiseScore(buf),
    detectBW(buf),
    getPHash(buf),
  ]);

  // Cloudinary free call (skip for local files)
  let cld = null;
  if (cloudinaryId && !cloudinaryId.startsWith('local:')) {
    cld = await getCloudinaryResource(cloudinaryId);
  }

  // ── Parse face data from Cloudinary bounding boxes (FREE) ──────────────────
  const cldFaces  = cld?.faces || [];      // array of [left%, top%, width%, height%] or {x,y,w,h}
  const faceCount = cldFaces.length;

  // Eye detection using face bounding boxes + Sharp crop
  let eyesOpen = null;
  if (faceCount > 0) {
    const faceBox = Array.isArray(cldFaces[0])
      ? { left: cldFaces[0][0] / 100, top: cldFaces[0][1] / 100, width: cldFaces[0][2] / 100, height: cldFaces[0][3] / 100 }
      : { left: (cldFaces[0].x || 0) / width, top: (cldFaces[0].y || 0) / height, width: (cldFaces[0].width || 0) / width, height: (cldFaces[0].height || 0) / height };
    eyesOpen = await detectEyesFromFaceBox(buf, faceBox, width, height);
  }

  // If Cloudinary didn't give faces (local file or failed), estimate from skin tone grid/blob clustering
  let estimatedFaceCount = faceCount;
  if (faceCount === 0 && !cld) {
    try {
      // Resize to 160x160 to separate faces via a higher resolution grid
      const { data, info } = await sharp(buf)
        .resize(160, 160, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const w = info.width;
      const h = info.height;
      const ch = info.channels;
      
      const gridRows = 16;
      const gridCols = 16;
      const cellW = w / gridCols;
      const cellH = h / gridRows;
      
      const grid = Array(gridRows).fill(0).map(() => Array(gridCols).fill(0));
      
      for (let r = 0; r < h; r++) {
        const gridR = Math.min(gridRows - 1, Math.floor(r / cellH));
        for (let c = 0; c < w; c++) {
          const gridC = Math.min(gridCols - 1, Math.floor(c / cellW));
          const idx = (r * w + c) * ch;
          const R = data[idx];
          const G = data[idx+1];
          const B = data[idx+2];
          
          // Convert RGB to HSV for more accurate skin tone segmentation (completely excludes pink/magenta cakes)
          const max = Math.max(R, G, B);
          const min = Math.min(R, G, B);
          const d = max - min;
          const s = max === 0 ? 0 : d / max;
          const v = max / 255;
          let hue = 0;
          if (max !== min) {
            if (max === R) hue = (G - B) / d + (G < B ? 6 : 0);
            else if (max === G) hue = (B - R) / d + 2;
            else hue = (R - G) / d + 4;
            hue /= 6;
          }
          const hDeg = hue * 360;
          
          // Tight HSV skin color check (Hue 0-28 or 350-360, Saturation 12%-62%, Value 15%-95%)
          const isSkin = (hDeg <= 28 || hDeg >= 350) &&
                         (s >= 0.12 && s <= 0.62) &&
                         (v >= 0.15 && v <= 0.95);
                          
          if (isSkin) {
            grid[gridR][gridC]++;
          }
        }
      }
      
      const cellTotalPixels = cellW * cellH;
      const threshold = cellTotalPixels * 0.25; // 25% skin pixels in a cell to be active
      
      const visited = Array(gridRows).fill(0).map(() => Array(gridCols).fill(false));
      let blobs = 0;
      
      const dfs = (r, c, blobInfo) => {
        visited[r][c] = true;
        blobInfo.cellCount++;
        if (r < blobInfo.minRow) blobInfo.minRow = r;
        if (r > blobInfo.maxRow) blobInfo.maxRow = r;
        if (c < blobInfo.minCol) blobInfo.minCol = c;
        if (c > blobInfo.maxCol) blobInfo.maxCol = c;
        
        const dirs = [
          [-1, 0], [1, 0], [0, -1], [0, 1],
          [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < gridRows && nc >= 0 && nc < gridCols) {
            if (!visited[nr][nc] && grid[nr][nc] >= threshold) {
              dfs(nr, nc, blobInfo);
            }
          }
        }
      };
      
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          if (!visited[r][c] && grid[r][c] >= threshold) {
            const blobInfo = { minRow: r, maxRow: r, minCol: c, maxCol: c, cellCount: 0 };
            dfs(r, c, blobInfo);
            
            // Check size and position (Faces are compact and in upper 70% of image)
            // Range 5-45 cells out of 256 cells is standard. minRow <= 11 is top 70%.
            if (blobInfo.cellCount >= 5 && blobInfo.cellCount <= 45 && blobInfo.minRow <= 11) {
              // Calculate standard deviation of luma inside the blob bounding box to reject uniform objects (cakes, walls, clothing)
              const startY = Math.round(blobInfo.minRow * cellH);
              const endY = Math.round((blobInfo.maxRow + 1) * cellH);
              const startX = Math.round(blobInfo.minCol * cellW);
              const endX = Math.round((blobInfo.maxCol + 1) * cellW);
              
              let sumLuma = 0;
              let sumLumaSq = 0;
              let cnt = 0;
              
              for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                  const idx = (y * w + x) * ch;
                  const R = data[idx];
                  const G = data[idx+1];
                  const B = data[idx+2];
                  const luma = 0.299 * R + 0.587 * G + 0.114 * B;
                  sumLuma += luma;
                  sumLumaSq += luma * luma;
                  cnt++;
                }
              }
              
              const meanLuma = sumLuma / cnt;
              const varianceLuma = (sumLumaSq / cnt) - (meanLuma * meanLuma);
              const stdDevLuma = Math.sqrt(Math.max(0, varianceLuma));
              
              // Human faces have high contrast features (eyes, nose, mouth shadows) -> stdDev >= 22
              // Cake/wall is smooth/uniform -> stdDev < 22
              if (stdDevLuma >= 22) {
                blobs++;
              }
            }
          }
        }
      }
      
      estimatedFaceCount = blobs;
    } catch (_) {
      estimatedFaceCount = 0;
    }
  }

  const faces = faceCount > 0 ? faceCount : estimatedFaceCount;

  // ── Colors ──────────────────────────────────────────────────────────────────
  const dominantColors = cld?.colors?.length
    ? cld.colors.slice(0, 5).map(([hex, pct]) => ({ color: hex, percentage: Math.round(pct) }))
    : await getDominantColorsFromBuffer(buf);

  // ── Quality score ────────────────────────────────────────────────────────────
  // Cloudinary quality_analysis.quality is 0–1 (free if add-on enabled)
  const cldQuality = (typeof cld?.quality_analysis?.quality === 'number')
    ? Math.round(cld.quality_analysis.quality * 100)
    : null;

  // ── Color grading detection ──────────────────────────────────────────────────
  let isColorGraded = false;
  if (!bw && dominantColors.length > 0 && dominantColors[0].percentage > 40) isColorGraded = true;

  // ── Scene detection: Indoor vs Outdoor ─────────────────────────────────────────
  let isIndoor = false;
  let outdoorScore = 0;
  let indoorScore = 0;

  if (exif) {
    if (exif.iso) {
      if (exif.iso >= 800) indoorScore += 3;
      if (exif.iso <= 200) outdoorScore += 2;
    }
    if (exif.shutterSpeed) {
      const match = exif.shutterSpeed.match(/^1\/(\d+)s$/);
      if (match) {
        const speed = parseInt(match[1]);
        if (speed <= 100) indoorScore += 2;
        if (speed >= 500) outdoorScore += 2;
      } else if (exif.shutterSpeed.endsWith('s')) {
        indoorScore += 3;
      }
    }
    if (exif.aperture) {
      const match = exif.aperture.match(/^f\/([\d.]+)$/);
      if (match) {
        const f = parseFloat(match[1]);
        if (f <= 2.8) indoorScore += 1;
        if (f >= 5.6) outdoorScore += 1;
      }
    }
  }

  let skyPixels = 0;
  let foliagePixels = 0;
  let warmLightPixels = 0;
  let skyPct = 0;
  let foliagePct = 0;
  let warmPct = 0;

  try {
    const { data, info } = await sharp(buf)
      .resize(40, 40, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const totalPx = info.width * info.height;
    const ch = info.channels;
    for (let i = 0; i < data.length; i += ch) {
      const r = data[i], g = data[i+1], b = data[i+2];
      // Sky blue
      if (r > 100 && g > 120 && b > 180 && b > r + 25 && b > g + 10) skyPixels++;
      // Foliage green (relaxed to capture olive, yellow-green and forest green under outdoor light)
      else if (g > b + 12 && g > r - 12 && g > 30) foliagePixels++;
      // Warm indoor light
      else if (r > 200 && g > 150 && b < 100) warmLightPixels++;
    }
    
    skyPct = skyPixels / totalPx;
    foliagePct = foliagePixels / totalPx;
    warmPct = warmLightPixels / totalPx;
    
    if (skyPct > 0.04) outdoorScore += 3;
    if (foliagePct > 0.05) outdoorScore += 3;
    if (warmPct > 0.08) indoorScore += 2;
  } catch (_) {}

  // If there is no blue sky and no green foliage, and no outdoor EXIF evidence, weight towards Indoor
  if (skyPct < 0.01 && foliagePct < 0.01 && outdoorScore === 0) {
    indoorScore += 1;
  }

  // Strict inequality
  isIndoor = indoorScore > outdoorScore;

  // ── Scene detection: Night / Dark ──────────────────────────────────────────────
  let isNight = false;
  let nightScore = 0;

  if (exif) {
    if (exif.takenAt) {
      const hour = new Date(exif.takenAt).getHours();
      if (hour >= 19 || hour <= 5) nightScore += 4;
    }
    if (exif.iso && exif.iso >= 3200) nightScore += 2;
  }

  if (exposure.score < 25) nightScore += 2;
  isNight = nightScore >= 3;

  // ── Theme detection: Wedding ───────────────────────────────────────────────────
  let isWedding = shootType === 'wedding';
  if (!isWedding) {
    let whitePixels = 0;
    let blackPixels = 0;
    try {
      const { data, info } = await sharp(buf)
        .resize(40, 40, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const totalPx = info.width * info.height;
      const ch = info.channels;
      for (let i = 0; i < data.length; i += ch) {
        const r = data[i], g = data[i+1], b = data[i+2];
        if (r > 220 && g > 220 && b > 220 && Math.max(r,g,b) - Math.min(r,g,b) < 15) whitePixels++;
        else if (r < 40 && g < 40 && b < 40) blackPixels++;
      }
      
      const whitePct = whitePixels / totalPx;
      const blackPct = blackPixels / totalPx;
      if (whitePct > 0.05 && blackPct > 0.05) isWedding = true;
    } catch (_) {}
  }

  // ── Build analysis object ────────────────────────────────────────────────────
  const analysis = {
    sharpness:   { score: sharpness.score, label: sharpness.label },
    exposure:    { score: exposure.score,  label: exposure.label, ev: exposure.ev },
    noise:       { score: noise.score,     label: noise.label, isNoisy: noise.isNoisy },
    composition: {
      score: cldQuality !== null ? cldQuality : Math.round(sharpness.score * 0.4 + noise.score * 0.6),
      label: (() => { const s = cldQuality !== null ? cldQuality : Math.round(sharpness.score * 0.4 + noise.score * 0.6); return s > 75 ? 'Excellent' : s > 55 ? 'Good' : s > 35 ? 'Average' : 'Poor'; })(),
      cloudinaryQuality: cldQuality,
    },
    faceCount:       faces,
    eyesOpen:        eyesOpen,
    isBlurry:        sharpness.isBlurry,
    isDuplicate:     false,
    isUnderexposed:  exposure.isUnderexposed,
    isOverexposed:   exposure.isOverexposed,
    isPortrait:      faces === 1,
    isCouplePhoto:   faces === 2,
    isGroupPhoto:    faces >= 3,
    isLandscape:     !displayHeight || (!( displayHeight > displayWidth) && ar > 1.2),
    isBlackAndWhite: bw,
    isColorGraded,
    isWedding,
    isIndoor,
    isNight,
    dominantColors,
    confidence:     cld ? 90 : 70,
    analyzedWith:   cld ? 'cloudinary+sharp' : 'sharp-only',
  };
  analysis.recommendations = buildRecommendations(analysis);

  // ── AI score (weighted) ──────────────────────────────────────────────────────
  const exposureOk = !exposure.isUnderexposed && !exposure.isOverexposed;
  const aiScore = Math.min(100, Math.max(0, Math.round(
    (cldQuality !== null ? cldQuality : sharpness.score) * 0.35 +
    sharpness.score           * 0.25 +
    (exposureOk ? 85 : 20)    * 0.25 +
    noise.score               * 0.15
  )));

  // ── Smart tags ───────────────────────────────────────────────────────────────
  const aiTags = [];
  if (analysis.isBlurry)          aiTags.push('blurry');
  if (analysis.isUnderexposed)    aiTags.push('underexposed');
  if (analysis.isOverexposed)     aiTags.push('overexposed');
  if (analysis.isPortrait)        aiTags.push('solo'); // Changed 'portrait' to 'solo' to align with client terminology and avoid orientation clash
  if (analysis.isCouplePhoto)     aiTags.push('couple');
  if (analysis.isGroupPhoto)      aiTags.push('group');
  if (analysis.isLandscape)       aiTags.push('landscape');
  if (analysis.isBlackAndWhite)   aiTags.push('black-and-white');
  if (analysis.isColorGraded)     aiTags.push('color-graded');
  if (analysis.isIndoor)          aiTags.push('indoor');
  if (!analysis.isIndoor)         aiTags.push('outdoor');
  if (analysis.isWedding)         aiTags.push('wedding');
  if (analysis.isNight)           aiTags.push('night');
  if (analysis.eyesOpen === false) aiTags.push('closed-eyes');
  if (noise.isNoisy)              aiTags.push('noisy');
  if (aiScore >= 85)              aiTags.push('best-pick');
  if (aiScore >= 90 && !analysis.isBlurry) aiTags.push('instagram-worthy');

  return { analysis, aiScore, aiTags, pHash, dimensions: { width, height } };
};

const buildRecommendations = (a) => {
  const r = [];
  if (a.exposure?.isUnderexposed)  r.push({ issue: 'Low Exposure',      severity: 'high',   suggestedFix: 'Increase exposure, lift shadows',    params: { Exposure: `+${Math.abs(a.exposure.ev||0.8)}`, Shadows: '+15', Blacks: '+10', Contrast: '+5' } });
  if (a.exposure?.isOverexposed)   r.push({ issue: 'Overexposed',       severity: 'high',   suggestedFix: 'Reduce exposure, recover highlights', params: { Exposure: `${a.exposure.ev||-0.8}`, Highlights: '-25', Whites: '-15' } });
  if (a.sharpness?.isBlurry)       r.push({ issue: 'Blur Detected',     severity: 'medium', suggestedFix: 'Sharpen or consider rejecting',        params: { Sharpening: '+40', Radius: '1.0', Detail: '35' } });
  if (a.noise?.isNoisy)            r.push({ issue: 'High Noise',        severity: 'low',    suggestedFix: 'Apply noise reduction',               params: { LuminanceNR: '40', ColorNR: '25', Detail: '50' } });
  if (a.eyesOpen === false)        r.push({ issue: 'Closed Eyes',       severity: 'high',   suggestedFix: 'Subject eyes appear closed — consider rejecting', params: {} });
  return r;
};

const comparePHash = (h1, h2) => {
  if (!h1 || !h2 || h1.length !== h2.length) return 0;
  let d = 0; for (let i = 0; i < h1.length; i++) if (h1[i] !== h2[i]) d++;
  return Math.round((1 - d / h1.length) * 100);
};

module.exports = { 
  analyzePhotoFull, 
  comparePHash, 
  getPHash, 
  getSharpnessScore, 
  getExposureScore,
  getNoiseScore,
  detectBW,
  getDominantColorsFromBuffer
};
