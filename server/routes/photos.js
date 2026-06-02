const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  uploadPhotos, finalizeUpload, getPhotos, getPhotoDetail,
  updatePhotoStatus, deletePhoto, bulkAction, searchPhotos, openLocalPhoto, getLocalFile
} = require('../controllers/photoController');

router.use(protect);
router.post('/upload/:projectId', upload.array('photos', 20), uploadPhotos);   // max 20 per batch
router.post('/finalize/:projectId', finalizeUpload);
router.post('/open-local', openLocalPhoto);
router.get('/local', getLocalFile);
router.get('/project/:projectId', getPhotos);
router.get('/search', searchPhotos);
router.get('/:id', getPhotoDetail);
router.put('/:id/status', updatePhotoStatus);
router.delete('/:id', deletePhoto);
router.post('/bulk', bulkAction);
module.exports = router;
