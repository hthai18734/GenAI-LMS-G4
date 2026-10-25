const ServiceError = require('../common/ServiceError');

const trim = (value) => typeof value === 'string' ? value.trim() : '';
const fail = (status, message) => { throw new ServiceError(status, message); };

class AuthService {
  constructor({ userRepository, refreshSessionRepository, oAuthAccountRepository, oAuthLoginTicketRepository, otpVerificationRepository, cryptoGateway, passwordGateway, otpGateway, tokenGateway, oAuthGateway, emailGateway } = {}) {
    this.userRepository = userRepository;
    this.refreshSessionRepository = refreshSessionRepository;
    this.oAuthAccountRepository = oAuthAccountRepository;
    this.oAuthLoginTicketRepository = oAuthLoginTicketRepository;
    this.otpVerificationRepository = otpVerificationRepository;
    this.cryptoGateway = cryptoGateway;
    this.passwordGateway = passwordGateway;
    this.otpGateway = otpGateway;
    this.tokenGateway = tokenGateway;
    this.oAuthGateway = oAuthGateway;
    this.emailGateway = emailGateway;
  }
  async register(body, issueOtp = this.issueOtp.bind(this)) {
    const fullName = trim(body.fullName); const email = trim(body.email).toLowerCase(); const phone = trim(body.phone);
    const error = this.validateRegistration(fullName, email, phone, body.password, body.confirmPassword);
    if (error) fail(400, error);
    if (await this.userRepository.isEmailExists(email)) fail(409, 'This email is already in use. Please use another email address.');
    const pending = await this.otpVerificationRepository.find(email, 'email_verification');
    if (pending?.resendAvailableAt > new Date() && (!pending.expiresAt || pending.expiresAt > new Date())) fail(429, `Please wait ${Math.ceil((pending.resendAvailableAt.getTime() - Date.now()) / 1000)} seconds before requesting another code.`);
    await issueOtp(email, { fullName, email, phone, passwordHash: await this.passwordGateway.hash(body.password) });
    return { status: 202, message: 'A verification code was sent to your email.' };
  }
  async verifyOtp(body) {
    const email = trim(body.email).toLowerCase(); const otp = trim(body.otp);
    if (!email || !otp) fail(400, 'Email and OTP are required.');
    const record = await this.otpVerificationRepository.find(email, 'email_verification');
    if (!record || (record.expiresAt && record.expiresAt <= new Date())) fail(400, 'No active verification request was found.');
    if ((record.otpExpiresAt || record.expiresAt) <= new Date()) fail(400, 'The OTP has expired. Select "Resend Code" to receive a new one.');
    if (record.wrongAttempts > this.otpGateway.MAX_WRONG_ATTEMPTS) fail(429, `You entered an incorrect OTP more than ${this.otpGateway.MAX_WRONG_ATTEMPTS} times. Select "Resend Code" to receive a new one.`);
    if (!this.otpGateway.verify(otp, record.otpHash)) {
      const updated = await this.otpVerificationRepository.incrementWrongAttempts(record._id);
      if (updated.wrongAttempts > this.otpGateway.MAX_WRONG_ATTEMPTS) fail(429, `You entered an incorrect OTP more than ${this.otpGateway.MAX_WRONG_ATTEMPTS} times. Select "Resend Code" to receive a new one.`);
      fail(400, `Incorrect OTP. You have ${this.otpGateway.MAX_WRONG_ATTEMPTS - updated.wrongAttempts} attempts remaining.`);
    }
    if (record.payload.existingUserId) {
      const user = await this.userRepository.verifyEmail(record.payload.existingUserId, email);
      if (!user) fail(409, 'Account changed. Please sign in again.');
      await this.otpVerificationRepository.clear(email, 'email_verification');
      return { message: 'Email verified successfully. Please sign in.', data: { user: this.toPublicUser(user) } };
    }
    if (await this.userRepository.isEmailExists(email)) { await this.otpVerificationRepository.clear(email, 'email_verification'); fail(409, 'This email is already in use.'); }
    try {
      const user = await this.userRepository.createUser({ ...record.payload, role: 'student', status: 'active', emailVerifiedAt: new Date() });
      await this.otpVerificationRepository.clear(email, 'email_verification');
      return { status: 201, message: 'Registration successful. Please sign in.', data: { user: this.toPublicUser(user) } };
    } catch (error) { if (error.code === 11000) fail(409, 'This email is already in use.'); throw error; }
  }
  async resendOtp(body, issueOtp = this.issueOtp.bind(this)) {
    const email = trim(body.email).toLowerCase(); if (!email) fail(400, 'Email is required.');
    const existing = await this.otpVerificationRepository.find(email, 'email_verification');
    if (!existing || (existing.expiresAt && existing.expiresAt <= new Date())) fail(400, 'No active verification request was found.');
    if (existing.resendAvailableAt > new Date()) fail(429, `Please wait ${Math.ceil((existing.resendAvailableAt.getTime() - Date.now()) / 1000)} seconds before requesting another code.`);
    await issueOtp(email, existing.payload);
    return { message: 'A new verification code has been sent to your email.' };
  }
  async login(body, issueOtp = this.issueOtp.bind(this)) {
    let email = trim(body.email).toLowerCase(); const password = body.password;
    if (!email || typeof password !== 'string' || !password) fail(400, 'Email and password are required.');
    let user = await this.userRepository.findByEmail(email, { includePassword: true });
    if (!user?.passwordHash || !await this.passwordGateway.compare(password, user.passwordHash)) fail(401, 'Invalid email or password.');
    if (!['pending', 'active'].includes(user.status)) fail(403, 'Your account has been deactivated.');
    if (user.status === 'pending' || !user.emailVerifiedAt) {
      const pending = await this.otpVerificationRepository.find(email, 'email_verification');
      if (!pending || pending.expiresAt <= new Date() || pending.resendAvailableAt <= new Date()) await issueOtp(email, { existingUserId: String(user._id) });
      const error = new ServiceError(403, 'Please verify your email before logging in. A verification code was sent to your email.');
      error.errors = { requiresEmailVerification: true, email }; throw error;
    }
    user = await this.userRepository.recordLoginSuccess(user._id);
    return { message: 'Login successful.', data: await this.createSession(user) };
  }
  getGoogleLoginUrl(origin) { return this.oAuthGateway.createAuthorizationUrl(origin); }
  async googleCallback({ code, state, providerError, cookieState }) {
    let baseOrigin = null;
    try {
      if (typeof state !== 'string' || (!providerError && typeof code !== 'string')) fail(400, 'Invalid Google OAuth callback.');
      let statePayload; try { statePayload = this.tokenGateway.verifyOAuthStateToken(state); } catch { fail(400, 'Invalid Google OAuth state.'); }
      if (!cookieState || cookieState !== state) fail(400, 'Invalid Google OAuth state.');
      baseOrigin = this.oAuthGateway.resolveFrontendOrigin(statePayload.origin);
      if (providerError) fail(400, 'Google sign-in was cancelled or denied.');
      const { profile } = await this.oAuthGateway.exchangeCode(code);
      if (typeof profile?.email !== 'string' || !profile.sub || profile.email_verified !== true) fail(400, 'Google account email is not verified.');
      const email = profile.email.trim().toLowerCase(); const user = await this.userRepository.findByEmail(email, { includePassword: true });
      if (!user) { const redirect = new URL('/register', baseOrigin); redirect.searchParams.set('reason', 'google_registration_required'); redirect.searchParams.set('email', email); return { redirect: redirect.toString(), baseOrigin }; }
      if (user.status === 'pending' || !user.emailVerifiedAt) fail(403, 'Please complete registration and verify your email with OTP before signing in with Google.');
      if (user.status !== 'active') fail(403, 'This AI-LMS account is deactivated.');
      if (!user.passwordHash) fail(403, 'Please set a password using Forgot password before signing in with Google.');
      await this.oAuthAccountRepository.linkGoogleAccount(user._id, { ...profile, email }); await this.userRepository.recordLoginSuccess(user._id);
      const redirect = new URL(baseOrigin ? `${baseOrigin}/oauth/callback` : (process.env.FRONTEND_OAUTH_SUCCESS_URL || 'http://localhost:5173/oauth/callback'));
      redirect.searchParams.set('code', await this.oAuthLoginTicketRepository.create(user._id));
      return { redirect: redirect.toString(), baseOrigin };
    } catch (error) { error.baseOrigin = baseOrigin; throw error; }
  }
  async exchangeGoogleLoginCode(code) {
    code = trim(code); if (!code) fail(400, 'OAuth login code is required.');
    const ticket = await this.oAuthLoginTicketRepository.consume(code); if (!ticket) fail(400, 'OAuth login code is invalid or expired.');
    const user = await this.userRepository.findById(ticket.userId); if (!user || user.status !== 'active') fail(403, 'Your account has been deactivated.');
    if (!user.emailVerifiedAt) fail(403, 'Please verify your email before logging in.');
    return { message: 'Google login successful.', data: await this.createSession(user) };
  }
  async logout(token) {
    if (typeof token === 'string') { try { const payload = this.tokenGateway.verifyRefreshToken(token); await this.refreshSessionRepository.remove(payload.sid, payload.sub); } catch (error) { if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) throw error; } }
    return { message: 'Logged out successfully.' };
  }
  async createSession(user) {
    const sessionId = this.refreshSessionRepository.createId(); const refreshToken = this.tokenGateway.createRefreshToken(user, sessionId); const payload = this.tokenGateway.verifyRefreshToken(refreshToken);
    await this.refreshSessionRepository.create({ _id: sessionId, userId: user._id, tokenHash: this.refreshSessionRepository.hash(refreshToken), expiresAt: new Date(payload.exp * 1000) });
    return { user: this.toPublicUser(user), accessToken: this.tokenGateway.createAccessToken(user, sessionId), refreshToken };
  }
  async requestPasswordReset(email) {
    email = trim(email).toLowerCase(); if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-zA-Z]{2,}$/.test(email)) fail(400, 'Invalid email format.');
    const user = await this.userRepository.findByEmail(email);
    if (user?.status === 'active' && user.emailVerifiedAt) {
      const token = this.cryptoGateway.randomBytes(32).toString('hex'); const tokenHash = this.cryptoGateway.createHash('sha256').update(token).digest('hex'); const saved = await this.userRepository.savePasswordReset(user._id, tokenHash, email);
      if (saved) { const url = new URL('/reset-password', process.env.FRONTEND_URL || 'http://localhost:5173'); url.searchParams.set('token', token); try { await this.emailGateway.sendPasswordReset(email, url.toString()); } catch (error) { await this.userRepository.clearPasswordReset(user._id, tokenHash); throw error; } }
    }
    return { message: 'If an active account exists for this email, a password reset link has been sent.' };
  }
  async resetPassword({ token, newPassword, confirmPassword }) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fail(400, 'Reset token is invalid or expired.');
    const error = this.passwordGateway.validate(newPassword); if (error) fail(400, error); if (newPassword !== confirmPassword) fail(400, 'Passwords do not match.');
    const user = await this.userRepository.resetPassword(this.cryptoGateway.createHash('sha256').update(token).digest('hex'), await this.passwordGateway.hash(newPassword));
    if (!user) fail(400, 'Reset token is invalid or expired.'); await this.refreshSessionRepository.removeByUser(user._id); return { message: 'Password reset successfully. Please sign in.' };
  }
  async changePassword(userId, { currentPassword, newPassword, confirmPassword }) {
    if (typeof currentPassword !== 'string' || !currentPassword) fail(400, 'Current password is required.');
    const error = this.passwordGateway.validate(newPassword); if (error) fail(400, error); if (newPassword !== confirmPassword) fail(400, 'Passwords do not match.');
    const user = await this.userRepository.findById(userId, { includePassword: true }); if (!user) fail(401, 'User not found.');
    if (!user.passwordHash || !await this.passwordGateway.compare(currentPassword, user.passwordHash)) fail(400, 'Current password is incorrect.');
    if (currentPassword === newPassword) fail(400, 'New password must differ from the current password.');
    const updated = await this.userRepository.changePassword(user._id, user.passwordHash, await this.passwordGateway.hash(newPassword)); if (!updated) fail(409, 'Account changed. Please sign in again.');
    await this.refreshSessionRepository.removeByUser(user._id); return { message: 'Password changed successfully. Please sign in again.' };
  }
  async refreshToken(token) {
    try {
      if (typeof token !== 'string' || !token) fail(401, 'Refresh token is required.');
      const payload = this.tokenGateway.verifyRefreshToken(token); const user = await this.userRepository.findById(payload.sub);
      if (!user) fail(401, 'User not found.'); if (user.status !== 'active') fail(403, 'Your account has been deactivated.');
      if ((payload.version || 0) !== (user.tokenVersion || 0)) fail(401, 'Session expired. Please sign in again.'); if (!user.emailVerifiedAt) fail(403, 'Please verify your email before logging in.');
      const refreshToken = this.tokenGateway.createRefreshToken(user, payload.sid); const session = await this.refreshSessionRepository.rotate(payload.sid, user._id, token, refreshToken);
      if (!session) fail(401, 'Invalid or expired refresh token.');
      return { data: { user: this.toPublicUser(user), accessToken: this.tokenGateway.createAccessToken(user, payload.sid), refreshToken } };
    } catch (error) { if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) fail(401, 'Invalid or expired refresh token.'); throw error; }
  }
  async issueOtp(email, payload) {
    const otp = this.otpGateway.generate(); const now = Date.now();
    try {
      await this.otpVerificationRepository.save({ email, purpose: 'email_verification', otpHash: this.otpGateway.hash(otp), payload, otpExpiresAt: new Date(now + this.otpGateway.OTP_EXPIRE_MS), expiresAt: new Date(now + this.otpGateway.PENDING_EXPIRE_MS), resendAvailableAt: new Date(now + this.otpGateway.RESEND_COOLDOWN_MS) });
    } catch (error) {
      if (error.code === 'OTP_COOLDOWN') fail(429, 'Please wait before requesting another code.');
      throw error;
    }
    try { await this.emailGateway.sendOtp(email, otp, 'email_verification'); } catch (error) { await this.otpVerificationRepository.clear(email, 'email_verification'); throw error; }
  }
  validateRegistration(fullName, email, phone, password, confirmPassword) {
    if (!fullName) return 'Full name is required.'; if (fullName.trim().split(/\s+/).length < 2) return 'Please enter a full name with at least two words.'; if (!/^[\p{L}\s]+$/u.test(fullName)) return 'Full name cannot contain numbers or special characters.'; if (fullName.length < 2 || fullName.length > 50) return 'Full name must be 2–50 characters long.';
    if (!email) return 'Email is required.'; if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-zA-Z]{2,}$/.test(email)) return 'Invalid email format.'; if (!phone) return 'Phone number is required.'; if (!/^(0[35789])\d{8}$/.test(phone)) return 'Invalid phone number format.';
    const error = this.passwordGateway.validate(password); if (error) return error; if (!confirmPassword) return 'Password confirmation is required.'; if (password !== confirmPassword) return 'Passwords do not match.'; return null;
  }
  toPublicUser(user) { return { id: String(user._id), fullName: user.fullName, email: user.email, phone: user.phone, role: user.role, teachingStatus: user.teachingStatus || 'active', avatar: user.avatar, status: user.status, emailVerifiedAt: user.emailVerifiedAt, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt, updatedAt: user.updatedAt }; }
}
module.exports = AuthService;
