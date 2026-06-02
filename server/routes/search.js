const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { search, suggestions } = require('../controllers/searchController');
router.use(protect);
router.get('/', search);
router.get('/suggestions', suggestions);
module.exports = router;
