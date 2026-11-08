const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

test('React API service manages refresh and session errors', async (t) => {
  const original = { window: global.window, localStorage: global.localStorage, fetch: global.fetch };
  const values = new Map();
  global.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
  global.window = new EventTarget();
  window.location = { pathname: '/login', replace: () => {} };
  t.after(() => { Object.assign(global, original); });
  const [client, auth] = await Promise.all([
    import(pathToFileURL(path.resolve(__dirname, '../../../frontend/src/shared/api/client.js')).href),
    import(pathToFileURL(path.resolve(__dirname, '../../../frontend/src/features/auth/api.js')).href),
  ]);
  const service = { ...client, ...auth };
  const session = { accessToken: 'old-access', refreshToken: 'old-refresh', user: { id: 'student', role: 'student', status: 'active' } };
  const refreshed = { ...session, accessToken: 'new-access', refreshToken: 'new-refresh' };
  const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

  await t.test('concurrent expired requests share one refresh and retry with the new access token', async () => {
    service.saveSession(session);
    let refreshCalls = 0;
    let retries = 0;
    global.fetch = async (url, options) => {
      if (url.includes('/refresh-token')) { refreshCalls++; assert.equal(JSON.parse(options.body).refreshToken, 'old-refresh'); await new Promise((resolve) => setTimeout(resolve, 10)); return response(200, { data: refreshed }); }
      if (options.headers.Authorization === 'Bearer old-access') return response(401, { message: 'Expired token.' });
      assert.equal(options.headers.Authorization, 'Bearer new-access'); retries++; return response(200, { data: { ok: true } });
    };
    const results = await Promise.all([service.api('/api/student/profile'), service.api('/api/student/courses')]);
    assert.equal(refreshCalls, 1); assert.equal(retries, 2); assert.equal(results.length, 2); assert.equal(service.getRefreshToken(), 'new-refresh');
  });

  await t.test('a delayed old-token rejection reuses an already refreshed session', async () => {
    service.saveSession(session);
    let refreshCalls = 0;
    let releaseLate;
    const late = new Promise((resolve) => { releaseLate = resolve; });
    global.fetch = async (url, options) => {
      if (url.includes('/refresh-token')) { refreshCalls++; return response(200, { data: refreshed }); }
      if (options.headers.Authorization === 'Bearer old-access') { if (url.endsWith('/late')) await late; return response(401, {}); }
      return response(200, { data: {} });
    };
    const slow = service.api('/api/student/late');
    await service.api('/api/student/profile'); releaseLate(); await slow;
    assert.equal(refreshCalls, 1);
  });

  await t.test('invalid login credentials stay on the login form and preserve the error status', async () => {
    service.clearSession();
    global.fetch = async () => response(401, { message: 'Invalid email or password.' });
    await assert.rejects(service.authService.login('student@test.edu', 'wrong'), (error) => error.status === 401 && /Invalid email/.test(error.message));
  });

  await t.test('an expired refresh token clears the session', async () => {
    service.saveSession(session);
    global.fetch = async () => response(401, { message: 'Invalid or expired refresh token.' });
    await assert.rejects(service.api('/api/student/profile'), /Invalid or expired refresh token/);
    assert.equal(service.getToken(), null); assert.equal(service.getRefreshToken(), null); assert.equal(service.getUser(), null);
  });

  await t.test('forbidden role preserves login; a locked account clears it', async () => {
    service.saveSession(session);
    global.fetch = async () => response(403, { message: 'You do not have permission to access this resource.' });
    await assert.rejects(service.api('/api/admin/users'), (error) => error.status === 403);
    assert.equal(service.getToken(), 'old-access');
    global.fetch = async () => response(403, { message: 'Your account has been deactivated.' });
    await assert.rejects(service.api('/api/student/profile'), (error) => error.status === 403);
    assert.equal(service.getToken(), null);
  });

  await t.test('refresh completion cannot restore a session cleared during logout', async () => {
    service.saveSession(session);
    let finish;
    const pending = new Promise((resolve) => { finish = resolve; });
    global.fetch = async () => { await pending; return response(200, { data: refreshed }); };
    const refreshing = service.refreshSession();
    service.clearSession(); finish();
    await assert.rejects(refreshing, /Session changed/); assert.equal(service.getToken(), null);
  });

  await t.test('logout sends the stored refresh token for server revocation', async () => {
    service.saveSession(session);
    global.fetch = async (url, options) => { assert.equal(url, '/api/auth/logout'); assert.equal(JSON.parse(options.body).refreshToken, 'old-refresh'); return response(200, { success: true }); };
    assert.equal((await service.authService.logout()).success, true);
  });

  await t.test('a delayed locked-account response cannot clear a newer login', async () => {
    service.saveSession(session);
    let finish;
    const pending = new Promise((resolve) => { finish = resolve; });
    global.fetch = async () => { await pending; return response(403, { message: 'Your account has been deactivated.' }); };
    const oldRequest = service.api('/api/student/profile');
    const newSession = { accessToken: 'different-access', refreshToken: 'different-refresh', user: { id: 'different-user', role: 'student' } };
    service.saveSession(newSession); finish();
    await assert.rejects(oldRequest, (error) => error.status === 403);
    assert.equal(service.getToken(), newSession.accessToken);
    assert.equal(service.getUser().id, newSession.user.id);
  });

  await t.test('a delayed old-account request is not retried using a different account', async () => {
    service.saveSession(session);
    let finish;
    let calls = 0;
    const pending = new Promise((resolve) => { finish = resolve; });
    global.fetch = async () => { calls++; if (calls > 1) return response(200, { data: {} }); await pending; return response(401, { message: 'Session expired.' }); };
    const oldRequest = service.api('/api/student/profile');
    const newSession = { accessToken: 'different-access', refreshToken: 'different-refresh', user: { id: 'different-user', role: 'student' } };
    service.saveSession(newSession); finish();
    await assert.rejects(oldRequest, (error) => error.status === 401);
    assert.equal(calls, 1);
    assert.equal(service.getToken(), newSession.accessToken);
  });
});
