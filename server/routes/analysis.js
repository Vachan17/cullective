const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { analyzeProjectPhotos, getAnalysisResults, getDuplicates } = require('../controllers/analysisController');

router.use(protect);
router.post('/project/:projectId', analyzeProjectPhotos);
router.get('/results/:projectId', getAnalysisResults);
router.get('/duplicates/:projectId', getDuplicates);
module.exports = router;
