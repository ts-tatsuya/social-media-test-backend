const express = require('express')
const { postingController } = require('../controllers')
const { upload } = require('../middlewares')

const router = express.Router()

router.get('/', postingController.fetchAllPostings);
router.get('/posting/:id', postingController.fetchPostingById);
router.get('/posting/:id/comments/five-recents', postingController.fetchFiveRecentComments);

router.post('/new', upload.single('postingImg'), postingController.addNewPosting);
router.post('/posting/comments/new', postingController.addNewComment);

router.patch('/posting/edit', postingController.editPostingById);

router.delete('/delete/:userId/:postingId', postingController.deletePosting);


module.exports = router