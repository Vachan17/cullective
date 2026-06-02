/**
 * ================================================================
 * FILE: server/controllers/exportController.js
 * ================================================================
 * Export analysis results as CSV or XMP sidecar files.
 *
 * ADD routes to server/routes/export.js (see file 06).
 * REGISTER in server/index.js:
 *   const exportRoutes = require('./routes/export');
 *   app.use('/api/export', exportRoutes);
 *
 * NO new packages needed for CSV.
 * XMP files let Lightroom read AI ratings directly.
 */

const Photo   = require('../models/Photo');
const Project = require('../models/Project');
const path    = require('path');
const fs      = require('fs');
const { errorResponse } = require('../utils/apiResponse');

// ── CSV export — full analysis data for every photo ──────────────────────────
exports.exportCSV = async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findOne({ _id: projectId, userId: req.user._id });
  if (!project) return errorResponse(res, 'Project not found', 404);

  const photos = await Photo.find({ projectId, status: { $ne: 'deleted' } }).lean();

  const headers = [
    'Filename', 'Status', 'AI Score', 'Sharpness', 'Exposure', 'Noise',
    'Faces', 'Eyes Open', 'Blurry', 'Duplicate', 'Portrait', 'Group',
    'Couple', 'Landscape', 'B&W', 'Color Graded', 'Tags', 'Analyzed With',
    'Recommendations', 'URL',
  ];

  const rows = photos.map(p => {
    const a = p.analysis || {};
    return [
      p.originalName,
      p.status,
      p.aiScore ?? '',
      a.sharpness?.score ?? '',
      a.exposure?.label ?? '',
      a.noise?.label ?? '',
      a.faceCount ?? '',
      a.eyesOpen === null ? '' : a.eyesOpen ? 'Yes' : 'No',
      a.isBlurry ? 'Yes' : 'No',
      a.isDuplicate ? 'Yes' : 'No',
      a.isPortrait ? 'Yes' : 'No',
      a.isGroupPhoto ? 'Yes' : 'No',
      a.isCouplePhoto ? 'Yes' : 'No',
      a.isLandscape ? 'Yes' : 'No',
      a.isBlackAndWhite ? 'Yes' : 'No',
      a.isColorGraded ? 'Yes' : 'No',
      (p.aiTags || []).join('; '),
      a.analyzedWith ?? 'sharp-only',
      (a.recommendations || []).map(r => r.issue).join('; '),
      p.url,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi,'_')}_analysis.csv"`);
  res.send(csv);
};

// ── JSON export — full structured data ───────────────────────────────────────
exports.exportJSON = async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findOne({ _id: projectId, userId: req.user._id });
  if (!project) return errorResponse(res, 'Project not found', 404);

  const photos = await Photo.find({ projectId, status: { $ne: 'deleted' } }).lean();

  const payload = {
    exportedAt: new Date().toISOString(),
    project: {
      name:        project.name,
      shootType:   project.shootType,
      shootDate:   project.shootDate,
      totalPhotos: project.totalPhotos,
    },
    summary: {
      bestPicks:   photos.filter(p => p.aiScore >= 80).length,
      blurry:      photos.filter(p => p.analysis?.isBlurry).length,
      duplicates:  photos.filter(p => p.analysis?.isDuplicate).length,
      avgScore:    photos.length ? Math.round(photos.reduce((s,p) => s+(p.aiScore||0),0)/photos.length) : 0,
    },
    photos: photos.map(p => ({
      filename:   p.originalName,
      url:        p.url,
      status:     p.status,
      aiScore:    p.aiScore,
      aiTags:     p.aiTags,
      analysis:   p.analysis,
      metadata:   p.metadata,
    })),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-z0-9]/gi,'_')}_export.json"`);
  res.send(JSON.stringify(payload, null, 2));
};

// ── XMP sidecar — import ratings into Lightroom Classic ──────────────────────
// Generates a .xmp file per photo with color label + rating based on AI score.
// Place XMP files in the same folder as the originals.
exports.exportXMP = async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findOne({ _id: projectId, userId: req.user._id });
  if (!project) return errorResponse(res, 'Project not found', 404);

  const photos = await Photo.find({
    projectId,
    status: { $in: ['analyzed', 'starred'] },
    aiScore: { $ne: null },
  }).lean();

  const scoreToRating = (score) => {
    if (score >= 90) return 5;
    if (score >= 80) return 4;
    if (score >= 70) return 3;
    if (score >= 55) return 2;
    return 1;
  };

  const scoreToLabel = (score, tags = []) => {
    if (tags.includes('blurry'))       return 'Red';
    if (score >= 85)                   return 'Green';
    if (score >= 70)                   return 'Yellow';
    return 'None';
  };

  const xmpFiles = photos.map(p => {
    const rating = scoreToRating(p.aiScore);
    const label  = scoreToLabel(p.aiScore, p.aiTags || []);
    const name   = path.parse(p.originalName).name;
    const tags   = (p.aiTags || []).join(', ');
    const rec    = (p.analysis?.recommendations || []).map(r => r.issue).join('; ');

    const xml = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:lr="http://ns.adobe.com/lightroom/1.0/">
      <xmp:Rating>${rating}</xmp:Rating>
      <xmp:Label>${label}</xmp:Label>
      <dc:description>
        <rdf:Alt><rdf:li xml:lang="x-default">AI Score: ${p.aiScore}/100 | ${rec || 'No issues'}</rdf:li></rdf:Alt>
      </dc:description>
      <dc:subject>
        <rdf:Bag>
          ${tags.split(', ').map(t => `<rdf:li>${t}</rdf:li>`).join('\n          ')}
        </rdf:Bag>
      </dc:subject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

    return { name: `${name}.xmp`, content: xml };
  });

  // Return as JSON list (client downloads them individually)
  // For a real zip, add 'archiver' package and stream a .zip
  res.json({
    success: true,
    message: `${xmpFiles.length} XMP files ready`,
    files:   xmpFiles.slice(0, 50), // limit response size
    total:   xmpFiles.length,
    note:    'Place each .xmp file in the same folder as the original photo. Lightroom will auto-detect them.',
  });
};

// ── Best picks list — simple list of URLs ─────────────────────────────────────
exports.exportBestPicks = async (req, res) => {
  const { projectId } = req.params;
  const minScore = parseInt(req.query.minScore) || 80;
  const project  = await Project.findOne({ _id: projectId, userId: req.user._id });
  if (!project) return errorResponse(res, 'Not found', 404);

  const photos = await Photo.find({
    projectId,
    aiScore: { $gte: minScore },
    status:  { $ne: 'deleted' },
  }).sort('-aiScore').lean();

  const lines = photos.map(p =>
    `${p.aiScore}\t${p.originalName}\t${p.url}`
  );
  const text = `# Best Picks — ${project.name}\n# Score\tFilename\tURL\n${lines.join('\n')}`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="best_picks.txt"`);
  res.send(text);
};
