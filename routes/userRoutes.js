const express = require('express')
const { userController } = require('../controllers')
const { auth, upload } = require('../middlewares');

const router = express.Router()

router.get('/:id', userController.fetchUser);
router.get('/username/unique-check/:usernameToBeChecked', userController.checkUsernameUnique);

router.post('/', userController.registerUser)
router.post('/login', userController.loginUser)
router.post('/check-login', auth.verifyToken, userController.checkLogin)
// router.get('/user', verifyToken, userController.fetchAllUser)
// router.get('/user/:id', verifyToken, userController.fetchUser)
router.post('/verification', auth.verifyToken, userController.verification)
router.post('/reset-password-request', userController.resetPasswordRequest);
router.post('/reset-password-request-resend', userController.resendVerification);
router.post('/reset-password-request/verification', auth.verifyToken, userController.resetPasswordRequestVerification);
router.patch('/reset-password', auth.verifyToken, userController.resetPassword);

router.patch('/edit/:id/', upload.single('profileImg'), userController.editUserInfo);
module.exports = router