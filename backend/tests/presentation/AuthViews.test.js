const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../../src/index');

test('authentication routes serve separate view files', async (t) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const cases = [
    ['/login', 'Welcome back', 'data-mode="login"'],
    ['/register', 'Create your AI-LMS account', 'data-mode="register"'],
    ['/verify-otp', 'Verify your email', 'data-mode="verify"'],
  ];

  for (const [route, heading, mode] of cases) {
    const response = await fetch(`${baseUrl}${route}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html/);
    assert.ok(html.includes(heading));
    assert.ok(html.includes(mode));
    assert.ok(html.includes('/assets/js/auth.js?v=views-2'));
    assert.equal(html.includes('/assets/js/app.js'), false);
  }

  const otpResponse = await fetch(`${baseUrl}/verify-otp`);
  const otpHtml = await otpResponse.text();
  assert.equal((otpHtml.match(/class="otp-box"/g) || []).length, 6);
  assert.ok(otpHtml.includes('class="otp-inputs"'));
  assert.ok(otpHtml.includes('autocomplete="one-time-code"'));
});
