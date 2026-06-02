const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getCollections, createCollection, addPhotosToCollection, rebuildSystemCollections, deleteCollection, exportLocalCollections } = require('../controllers/collectionController');

router.use(protect);
router.get('/project/:projectId', getCollections);
router.post('/', createCollection);
router.put('/:id/photos', addPhotosToCollection);
router.post('/rebuild/:projectId', rebuildSystemCollections);
router.post('/export-local/:projectId', exportLocalCollections);
router.delete('/:id', deleteCollection);
module.exports = router;
