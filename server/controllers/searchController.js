const Photo = require('../models/Photo');
const Project = require('../models/Project');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Extended synonym map — every natural phrase a photographer would type
const PHRASE_TAGS = {
  // Quality
  'blurry':'blurry','blur':'blurry','out of focus':'blurry','soft':'blurry',
  'sharp':'best-pick','crisp':'best-pick','clear':'best-pick',
  'best':'best-pick','top':'best-pick','hero':'best-pick','selects':'best-pick',
  'instagram':'instagram-worthy','social':'instagram-worthy','wow':'instagram-worthy',
  'noisy':'noisy','grainy':'noisy','noise':'noisy',

  // Exposure
  'dark':'underexposed','underexposed':'underexposed','too dark':'underexposed','dim':'underexposed',
  'bright':'overexposed','overexposed':'overexposed','blown':'overexposed','washed':'overexposed',

  // People
  'portrait':'portrait','headshot':'portrait','solo':'portrait','single person':'portrait',
  'couple':'couple','two people':'couple','pair':'couple','bride and groom':'couple','engagement':'couple',
  'group':'group','crowd':'group','family':'group','wedding party':'group','team':'group','everyone':'group',
  'closed eyes':'closed-eyes','eyes closed':'closed-eyes','blinking':'closed-eyes',

  // Scene
  'landscape':'landscape','outdoor':'landscape','nature':'landscape','scenery':'landscape',
  'black and white':'black-and-white','bw':'black-and-white','monochrome':'black-and-white','black & white':'black-and-white',
  'color graded':'color-graded','cinematic':'color-graded','graded':'color-graded','edited':'color-graded',

  // Rejected
  'rejected':'rejected','trash':'rejected','delete':'rejected','bad':'rejected',
  'starred':'starred','favorite':'starred','pick':'starred',
};

// Score filter shortcuts
const SCORE_FILTERS = {
  'excellent': { $gte: 85 },
  'good quality': { $gte: 70 },
  'poor quality': { $lt: 50 },
  'high score': { $gte: 80 },
  'low score': { $lt: 40 },
};

exports.search = async (req, res) => {
  const { q, projectId, page = 1, limit = 100 } = req.query;
  if (!q || q.trim().length < 1) return errorResponse(res, 'Query required', 400);

  const lq = q.toLowerCase().trim();
  const query = { userId: req.user._id, status: { $ne: 'deleted' } };
  if (projectId) query.projectId = projectId;

  // ── 1. Check score shortcuts ──────────────────────────────────────────────
  for (const [phrase, filter] of Object.entries(SCORE_FILTERS)) {
    if (lq.includes(phrase)) { query.aiScore = filter; break; }
  }

  // ── 2. Status shortcuts ───────────────────────────────────────────────────
  if (lq.includes('starred') || lq.includes('favorite')) query.status = 'starred';
  else if (lq.includes('rejected') || lq.includes('trash')) query.status = 'rejected';

  // ── 3. Build tag matches from phrase map ──────────────────────────────────
  const matchedTags = new Set();
  // Try multi-word phrases first (longer = more specific)
  const sorted = Object.keys(PHRASE_TAGS).sort((a,b) => b.length - a.length);
  for (const phrase of sorted) {
    if (lq.includes(phrase)) matchedTags.add(PHRASE_TAGS[phrase]);
  }

  // ── 4. Compose final query ────────────────────────────────────────────────
  const conditions = [];
  if (matchedTags.size) conditions.push({ aiTags: { $in: [...matchedTags] } });

  // Filename / original name fuzzy
  const words = lq.split(/\s+/).filter(w => w.length > 2);
  if (words.length) {
    conditions.push({
      $or: words.map(w => ({ originalName: { $regex: w, $options: 'i' } }))
    });
  }

  if (conditions.length) {
    query.$or = conditions;
    delete query.status; // let $or handle status-based matches
    if (matchedTags.size && (lq.includes('starred') || lq.includes('rejected'))) {
      query.status = lq.includes('starred') ? 'starred' : 'rejected';
    }
  } else {
    // Pure filename fallback
    query.originalName = { $regex: lq, $options: 'i' };
  }

  const skip = (page - 1) * limit;
  const [photos, total] = await Promise.all([
    Photo.find(query).sort('-aiScore').skip(skip).limit(Number(limit)),
    Photo.countDocuments(query),
  ]);

  return successResponse(res, {
    photos, total,
    query: q,
    matchedTags: [...matchedTags],
    page: Number(page),
  });
};

// GET /api/search/suggestions?q=bri
exports.suggestions = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 1) return successResponse(res, { suggestions: [] });
  const lq = q.toLowerCase();
  const matched = Object.keys(PHRASE_TAGS)
    .filter(p => p.startsWith(lq))
    .slice(0, 8);
  return successResponse(res, { suggestions: matched });
};
