const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../../src/index');

test('API server leaves authentication pages to the React frontend', async (t) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/login', '/register', '/verify-otp', '/request-password-reset', '/reset-password']) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type'), /^application\/json/);
    assert.deepEqual(await res.json(), { success: false, message: 'Route not found.' });
  }
});
