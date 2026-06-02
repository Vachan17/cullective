/**
 * ================================================================
 * FILE: server/routes/export.js
 * ================================================================
 * Register this in server/index.js:
 *
 *   const exportRoutes = require('./routes/export');
 *   app.use('/api/export', exportRoutes);
 */

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const {
  exportCSV,
  exportJSON,
  exportXMP,
  exportBestPicks,
} = require('../controllers/exportController');

router.use(protect);

// GET /api/export/:projectId/csv        → download CSV
// GET /api/export/:projectId/json       → download JSON
// GET /api/export/:projectId/xmp        → XMP sidecar data
// GET /api/export/:projectId/best-picks → best picks TXT
router.get('/:projectId/csv',        exportCSV);
router.get('/:projectId/json',       exportJSON);
router.get('/:projectId/xmp',        exportXMP);
router.get('/:projectId/best-picks', exportBestPicks);

module.exports = router;
