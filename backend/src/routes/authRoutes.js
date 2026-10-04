const express = require('express');
const NoCacheFilter = require('../filter/NoCacheFilter');
const AuthController = require('../controller/auth/AuthController');

const router = express.Router();
router.use(NoCacheFilter);

router.post('/register', AuthController.register.bind(AuthController));
router.post('/verify-otp', AuthController.verifyOtp.bind(AuthController));
router.post('/resend-otp', AuthController.resendOtp.bind(AuthController));
router.post('/login', AuthController.login.bind(AuthController));
router.get('/google', AuthController.getGoogleLoginUrl.bind(AuthController));
router.get('/google/callback', AuthController.googleCallback.bind(AuthController));
router.post('/google/exchange', AuthController.exchangeGoogleLoginCode.bind(AuthController));
router.post('/logout', AuthController.logout.bind(AuthController));

module.exports = router;
