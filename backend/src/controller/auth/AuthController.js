const LoggerUtil = require('../../utils/common/LoggerUtil');
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { authService: AuthService } = require('../../composition/services');

class AuthController {
  async send(res, next, action) {
    try {
      const result = await action();
      return ResponseUtil.success(res, { status: result.status, message: result.message, data: result.data });
    } catch (error) {
      if (error.status && error.publicMessage) return ResponseUtil.error(res, { status: error.status, message: error.publicMessage, errors: error.errors });
      return next(error);
    }
  }
  async register(req, res, next) { return this.send(res, next, () => AuthService.register(req.body, this.issueOtp.bind(this))); }
  async verifyOtp(req, res, next) { return this.send(res, next, () => AuthService.verifyOtp(req.body)); }
  async resendOtp(req, res, next) { return this.send(res, next, () => AuthService.resendOtp(req.body, this.issueOtp.bind(this))); }
  async login(req, res, next) { return this.send(res, next, () => AuthService.login(req.body, this.issueOtp.bind(this))); }
  getGoogleLoginUrl(req, res, next) {
    try {
      const origin = req.query.origin || req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null) || process.env.FRONTEND_URL || 'http://localhost:5173';
      const { state, url } = AuthService.getGoogleLoginUrl(origin);
      res.setHeader('Set-Cookie', this.buildOAuthStateCookie(state));
      return ResponseUtil.success(res, { data: { url } });
    } catch (error) { return next(error); }
  }
  async googleCallback(req, res) {
    try {
      const result = await AuthService.googleCallback({ code: req.query.code, state: req.query.state, providerError: req.query.error, cookieState: this.readCookie(req, 'ai_lms_oauth_state') });
      res.setHeader('Set-Cookie', this.buildOAuthStateCookie('', { clear: true }));
      return res.redirect(result.redirect);
    } catch (error) {
      LoggerUtil.warn('Google OAuth callback failed', { message: error.message });
      return this.redirectOAuthError(res, error.publicMessage || 'Google sign-in failed.', error.baseOrigin);
    }
  }
  async exchangeGoogleLoginCode(req, res, next) { return this.send(res, next, () => AuthService.exchangeGoogleLoginCode(req.body.code)); }
  async logout(req, res, next) { return this.send(res, next, () => AuthService.logout(req.body.refreshToken)); }
  async createSession(user) { return AuthService.createSession(user); }
  async requestPasswordReset(req, res, next) { return this.send(res, next, () => AuthService.requestPasswordReset(req.body.email)); }
  async resetPassword(req, res, next) { return this.send(res, next, () => AuthService.resetPassword(req.body)); }
  async changePassword(req, res, next) { return this.send(res, next, () => AuthService.changePassword(req.user._id, req.body)); }
  async refreshToken(req, res, next) { return this.send(res, next, () => AuthService.refreshToken(req.body.refreshToken)); }
  async issueOtp(email, payload) { return AuthService.issueOtp(email, payload); }
  validateRegistration(...args) { return AuthService.validateRegistration(...args); }
  toPublicUser(user) { return AuthService.toPublicUser(user); }
  trim(value) { return typeof value === 'string' ? value.trim() : ''; }
  buildOAuthStateCookie(state, { clear = false } = {}) {
    const attributes = [`ai_lms_oauth_state=${encodeURIComponent(state)}`, 'HttpOnly', 'SameSite=Lax', 'Path=/api', `Max-Age=${clear ? 0 : 600}`];
    if (process.env.NODE_ENV === 'production') attributes.push('Secure');
    return attributes.join('; ');
  }
  readCookie(req, name) {
    for (const cookie of String(req.headers.cookie || '').split(';')) {
      const separator = cookie.indexOf('='); if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
      try { return decodeURIComponent(cookie.slice(separator + 1)); } catch { return null; }
    }
    return null;
  }
  redirectOAuthError(res, message, baseOrigin = null) {
    const target = baseOrigin ? `${baseOrigin}/login` : (process.env.FRONTEND_OAUTH_ERROR_URL || new URL('/login', process.env.FRONTEND_URL || 'http://localhost:5173').toString());
    const redirect = new URL(target); redirect.searchParams.set('error', message); return res.redirect(redirect.toString());
  }
}
module.exports = new AuthController();
