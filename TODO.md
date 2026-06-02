# TODO
- [x] Gather/verify Cloudinary integration points (utility + controller)
- [x] Add backend utility to fetch Cloudinary resource metadata by `cloudinaryId`
- [x] Enrich `getPhotoDetail` response with Cloudinary details (width/height/format/fileSize/secure_url/url)

- [ ] (Optional) Persist enriched fields back to MongoDB for faster subsequent reads
- [x] Fix group/couple misclassification by making face classification stricter

- [ ] Run basic smoke test: call `GET /api/photos/:id` and verify response contains enriched fields



