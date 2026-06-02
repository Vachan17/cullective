const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { browseFolder, countFolder, startScan, getScanStatus } = require('../controllers/scanController');

router.use(protect);
router.get('/browse', browseFolder);
router.get('/count', countFolder);
router.post('/start', startScan);
router.get('/status/:projectId', getScanStatus);
module.exports = router;
