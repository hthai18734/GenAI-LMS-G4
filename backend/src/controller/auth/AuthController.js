const crypto = require('crypto');
const UserDAO = require('../../dao/identity/UserDAO');
const OAuthAccountDAO = require('../../dao/identity/OAuthAccountDAO');
const OAuthLoginTicketDAO = require('../../dao/identity/OAuthLoginTicketDAO');
const OtpVerificationDAO = require('../../dao/identity/OtpVerificationDAO');
const PasswordUtil = require('../../utils/auth/PasswordUtil');
const OTPUtil = require('../../utils/auth/OTPUtil');
const JWTUtil = require('../../utils/auth/JWTUtil');
const OAuthUtil = require('../../utils/auth/OAuthUtil');
const EmailUtil = require('../../utils/email/EmailUtil');
const LoggerUtil = require('../../utils/common/LoggerUtil');
const ResponseUtil = require('../../utils/common/ResponseUtil');

class AuthController {
  async register(req, res, next) {
    try {
      const fullName = this.trim(req.body.fullName);
      const email = this.trim(req.body.email)?.toLowerCase();
      const phone = this.trim(req.body.phone);
      const password = req.body.password;
      const confirmPassword = req.body.confirmPassword;

      const error = this.validateRegistration(fullName, email, phone, password, confirmPassword);
      if (error) return ResponseUtil.error(res, { status: 400, message: error });
      if (await UserDAO.isEmailExists(email)) {
        return ResponseUtil.error(res, { status: 409, message: 'This email is already in use. Please use another email address.' });
      }

      const passwordHash = await PasswordUtil.hash(password);
      await this.issueOtp(email, { fullName, email, phone, passwordHash });
      return ResponseUtil.success(res, { status: 202, message: 'A verification code was sent to your email.' });
    } catch (error) {
      return next(error);
    }
  }

  async verifyOtp(req, res, next) {
    try {
      const email = this.trim(req.body.email)?.toLowerCase();
      const otp = this.trim(req.body.otp);
      if (!email || !otp) return ResponseUtil.error(res, { status: 400, message: 'Email and OTP are required.' });

      const record = await OtpVerificationDAO.find(email, 'email_verification');
      if (!record) {
        return ResponseUtil.error(res, { status: 400, message: 'No active verification request was found.' });
      }
      const otpExpiresAt = record.otpExpiresAt || record.expiresAt;
      if (otpExpiresAt <= new Date()) {
        return ResponseUtil.error(res, { status: 400, message: 'The OTP has expired. Select "Resend Code" to receive a new one.' });
      }
      if (record.wrongAttempts > OTPUtil.MAX_WRONG_ATTEMPTS) {
        return ResponseUtil.error(res, {
          status: 429,
          message: `You entered an incorrect OTP more than ${OTPUtil.MAX_WRONG_ATTEMPTS} times. Select "Resend Code" to receive a new one.`,
        });
      }

      if (!OTPUtil.verify(otp, record.otpHash)) {
        const updated = await OtpVerificationDAO.incrementWrongAttempts(record._id);
        if (updated.wrongAttempts > OTPUtil.MAX_WRONG_ATTEMPTS) {
          return ResponseUtil.error(res, {
            status: 429,
            message: `You entered an incorrect OTP more than ${OTPUtil.MAX_WRONG_ATTEMPTS} times. Select "Resend Code" to receive a new one.`,
          });
        }
        const remaining = OTPUtil.MAX_WRONG_ATTEMPTS - updated.wrongAttempts;
        return ResponseUtil.error(res, { status: 400, message: `Incorrect OTP. You have ${remaining} attempts remaining.` });
      }

      if (await UserDAO.isEmailExists(email)) {
        await OtpVerificationDAO.clear(email, 'email_verification');
        return ResponseUtil.error(res, { status: 409, message: 'This email is already in use.' });
      }

      const user = await UserDAO.createUser({
        ...record.payload,
        role: 'student',
        status: 'active',
        emailVerifiedAt: new Date(),
      });
      await OtpVerificationDAO.clear(email, 'email_verification');
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Registration successful. Please sign in.',
        data: { user: this.toPublicUser(user) },
      });
    } catch (error) {
      if (error?.code === 11000) return ResponseUtil.error(res, { status: 409, message: 'This email is already in use.' });
      return next(error);
    }
  }

  async resendOtp(req, res, next) {
    try {
      const email = this.trim(req.body.email)?.toLowerCase();
      if (!email) return ResponseUtil.error(res, { status: 400, message: 'Email is required.' });

      const existing = await OtpVerificationDAO.find(email, 'email_verification');
      if (!existing) return ResponseUtil.error(res, { status: 400, message: 'No active verification request was found.' });
      if (existing.resendAvailableAt > new Date()) {
        const waitSec = Math.ceil((existing.resendAvailableAt.getTime() - Date.now()) / 1000);
        return ResponseUtil.error(res, { status: 429, message: `Please wait ${waitSec} seconds before requesting another code.` });
      }

      await this.issueOtp(email, existing.payload);
      return ResponseUtil.success(res, { message: 'A new verification code has been sent to your email.' });
    } catch (error) {
      return next(error);
    }
  }

  async login(req, res, next) {
    try {
      let email = this.trim(req.body.email)?.toLowerCase();
      const password = req.body.password;
      if (!email || !password) return ResponseUtil.error(res, { status: 400, message: 'Email and password are required.' });

      if (email === 'teacher') {
        email = 'teacher@ai-lms.edu';
      }

      let user = await UserDAO.findByEmail(email, { includePassword: true });
      if (!user || !(await PasswordUtil.compare(password, user.passwordHash))) {
        return ResponseUtil.error(res, { status: 401, message: 'Invalid email or password.' });
      }
      if (user.status !== 'active') {
        return ResponseUtil.error(res, { status: 403, message: user.status === 'pending' ? 'Please verify your email before logging in.' : 'Your account has been deactivated.' });
      }

      user = await UserDAO.recordLoginSuccess(user._id);
      return ResponseUtil.success(res, {
        message: 'Login successful.',
        data: { user: this.toPublicUser(user), accessToken: JWTUtil.createAccessToken(user) },
      });
    } catch (error) {
      return next(error);
    }
  }

  getGoogleLoginUrl(req, res, next) {
    try {
      const origin = req.query.origin
        || req.headers.origin
        || (req.headers.referer ? new URL(req.headers.referer).origin : null)
        || process.env.FRONTEND_URL
        || 'http://localhost:5173';
      const { state, url } = OAuthUtil.createAuthorizationUrl(origin);
      res.setHeader('Set-Cookie', this.buildOAuthStateCookie(state));
      return ResponseUtil.success(res, { data: { url } });
    } catch (error) {
      return next(error);
    }
  }

  async googleCallback(req, res, next) {
    let baseOrigin = null;

    try {
      const { code, state, error: providerError } = req.query;
      if (providerError) return this.redirectOAuthError(res, 'Google sign-in was cancelled or denied.', baseOrigin);
      if (!code || !state) return this.redirectOAuthError(res, 'Invalid Google OAuth callback.', baseOrigin);

      let statePayload;
      try {
        statePayload = JWTUtil.verifyOAuthStateToken(state);
      } catch {
        return this.redirectOAuthError(res, 'Invalid Google OAuth state.', baseOrigin);
      }

      baseOrigin = statePayload.origin || null;
      res.setHeader('Set-Cookie', this.buildOAuthStateCookie('', { clear: true }));

      const { profile } = await OAuthUtil.exchangeCode(code);
      if (!profile?.email || !profile.email_verified) {
        return this.redirectOAuthError(res, 'Google account email is not verified.', baseOrigin);
      }

      let user = await UserDAO.findByEmail(profile.email);
      if (!user) {
        const dummyPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await PasswordUtil.hash(dummyPassword);
        user = await UserDAO.createUser({
          fullName: profile.name || profile.given_name || 'Student Learner',
          email: profile.email.toLowerCase(),
          role: 'student',
          status: 'active',
          avatar: profile.picture || null,
          passwordHash,
          emailVerifiedAt: new Date(),
        });
      } else if (user.status === 'pending') {
        user.status = 'active';
        user.emailVerifiedAt = user.emailVerifiedAt || new Date();
        await user.save();
      } else if (user.status !== 'active') {
        return this.redirectOAuthError(res, 'This AI-LMS account is deactivated.', baseOrigin);
      }

      await OAuthAccountDAO.linkGoogleAccount(user._id, profile);
      await UserDAO.recordLoginSuccess(user._id);
      const loginCode = await OAuthLoginTicketDAO.create(user._id);

      const targetBase = baseOrigin ? `${baseOrigin}/oauth/callback` : (process.env.FRONTEND_OAUTH_SUCCESS_URL || 'http://localhost:5173/oauth/callback');
      const redirect = new URL(targetBase);
      redirect.searchParams.set('code', loginCode);
      return res.redirect(redirect.toString());
    } catch (error) {
      LoggerUtil.warn('Google OAuth callback failed', { message: error.message });
      return this.redirectOAuthError(res, 'Google sign-in failed.', baseOrigin);
    }
  }

  async exchangeGoogleLoginCode(req, res, next) {
    try {
      const code = this.trim(req.body.code);
      if (!code) return ResponseUtil.error(res, { status: 400, message: 'OAuth login code is required.' });
      const ticket = await OAuthLoginTicketDAO.consume(code);
      if (!ticket) return ResponseUtil.error(res, { status: 400, message: 'OAuth login code is invalid or expired.' });
      const user = await UserDAO.findById(ticket.userId);
      if (!user || user.status !== 'active') return ResponseUtil.error(res, { status: 403, message: 'Your account has been deactivated.' });
      return ResponseUtil.success(res, {
        message: 'Google login successful.',
        data: { user: this.toPublicUser(user), accessToken: JWTUtil.createAccessToken(user) },
      });
    } catch (error) {
      return next(error);
    }
  }

  async logout(req, res, next) {
    try {
      return ResponseUtil.success(res, { message: 'Logged out successfully.' });
    } catch (error) {
      return next(error);
    }
  }

  async issueOtp(email, payload) {
    const otp = OTPUtil.generate();
    LoggerUtil.info(`[OTP] Generated verification code for ${email}: ${otp}`);
    const now = Date.now();
    await OtpVerificationDAO.save({
      email,
      purpose: 'email_verification',
      otpHash: OTPUtil.hash(otp),
      payload,
      otpExpiresAt: new Date(now + OTPUtil.OTP_EXPIRE_MS),
      expiresAt: new Date(now + OTPUtil.PENDING_EXPIRE_MS),
      resendAvailableAt: new Date(now + OTPUtil.RESEND_COOLDOWN_MS),
    });
    try {
      await EmailUtil.sendOtp(email, otp, 'email_verification');
    } catch (error) {
      await OtpVerificationDAO.clear(email, 'email_verification');
      throw error;
    }
  }

  validateRegistration(fullName, email, phone, password, confirmPassword) {
    if (!fullName) return 'Full name is required.';
    if (fullName.trim().split(/\s+/).length < 2) return 'Please enter a full name with at least two words.';
    if (!/^[\p{L}\s]+$/u.test(fullName)) return 'Full name cannot contain numbers or special characters.';
    if (fullName.length < 2 || fullName.length > 50) return 'Full name must be 2–50 characters long.';
    if (!email) return 'Email is required.';
    if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-zA-Z]{2,}$/.test(email)) return 'Invalid email format.';
    if (!phone) return 'Phone number is required.';
    if (!/^(0[35789])\d{8}$/.test(phone)) return 'Invalid phone number format.';
    const passwordError = PasswordUtil.validate(password);
    if (passwordError) return passwordError;
    if (!confirmPassword) return 'Password confirmation is required.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  }

  toPublicUser(user) {
    return {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  trim(value) {
    return typeof value === 'string' ? value.trim() : value;
  }

  buildOAuthStateCookie(state, { clear = false } = {}) {
    const attributes = [
      `ai_lms_oauth_state=${encodeURIComponent(state)}`,
      'HttpOnly',
      'SameSite=Lax',
      'Path=/api/auth/google',
      `Max-Age=${clear ? 0 : 600}`,
    ];
    if (process.env.NODE_ENV === 'production') attributes.push('Secure');
    return attributes.join('; ');
  }

  readCookie(req, name) {
    const cookies = String(req.headers.cookie || '').split(';');
    for (const cookie of cookies) {
      const separator = cookie.indexOf('=');
      if (separator < 0) continue;
      const key = cookie.slice(0, separator).trim();
      if (key === name) return decodeURIComponent(cookie.slice(separator + 1));
    }
    return null;
  }

  redirectOAuthError(res, message, baseOrigin = null) {
    const errorUrl = baseOrigin ? `${baseOrigin}/login` : (process.env.FRONTEND_OAUTH_ERROR_URL || 'http://localhost:5173/login');
    const redirect = new URL(errorUrl);
    redirect.searchParams.set('error', message);
    return res.redirect(redirect.toString());
  }
}

module.exports = new AuthController();
