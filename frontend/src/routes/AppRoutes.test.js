import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoutesFromElements, matchRoutes, MemoryRouter } from 'react-router-dom';

test('portal navigation and quiz links resolve to pages with the correct role guard', async (t) => {
  const server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' });
  t.after(() => server.close());
  const [{ default: AppRoutes }, { default: Sidebar }, { default: AuthContext }, { default: PasswordInput }] = await Promise.all([
    server.ssrLoadModule('/src/routes/AppRoutes.jsx'),
    server.ssrLoadModule('/src/components/Sidebar.jsx'),
    server.ssrLoadModule('/src/features/auth/authContext.js'),
    server.ssrLoadModule('/src/components/PasswordInput.jsx'),
  ]);
  const routes = createRoutesFromElements(AppRoutes().props.children);
  function resolve(path, role) {
    const matches = matchRoutes(routes, path);
    assert.ok(matches, path);
    const leaf = matches.at(-1).route;
    assert.notEqual(leaf.path, '*', `${role}: ${path} must resolve to a real page`);
    const guard = matches.find((match) => match.route.element?.type.name === 'ProtectedRoute');
    if (role) {
      assert.ok(guard, `${path} requires authentication`);
      const allowedRoles = guard.route.element.props.roles;
      assert.ok(!allowedRoles || allowedRoles.includes(role), `${role} must have access to ${path}`);
    } else {
      assert.equal(guard, undefined, `${path} must be public`);
    }
    return leaf.element.type.name;
  }

  for (const role of ['student', 'teacher', 'admin']) {
    const markup = renderToStaticMarkup(createElement(AuthContext.Provider, { value: { user: { role }, logout() {} } },
      createElement(MemoryRouter, null, createElement(Sidebar))));
    const links = [...markup.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(links.length > 3);
    for (const path of [...links, '/profile', '/change-password', '/notifications']) resolve(path, role);
  }
  assert.equal(resolve('/courses/course-id/learn', 'student'), 'CourseLearnPage');
  assert.deepEqual(matchRoutes(routes, '/courses/course-id/learn')[0].route.element.props.roles, ['student']);
  assert.equal(resolve('/teacher/courses/course-id/preview', 'teacher'), 'CourseLearnPage');
  for (const path of ['/login', '/register', '/verify-otp', '/request-password-reset', '/reset-password']) resolve(path);
  for (const [path, name] of [
    ['/quizzes/quiz-id/start', 'StudentQuizStartPage'],
    ['/quiz-attempts/attempt-id', 'StudentQuizAttemptPage'],
    ['/quiz-attempts/attempt-id/result', 'StudentQuizResultPage'],
  ]) assert.equal(resolve(path, 'student'), name);
  for (const path of ['/admin/users/new', '/admin/users/user-id', '/admin/users/user-id/edit', '/admin/vouchers/new', '/admin/vouchers/voucher-id', '/admin/vouchers/voucher-id/edit']) resolve(path, 'admin');
  assert.equal(matchRoutes(routes, '/missing-page').at(-1).route.element.type.name, 'NotFoundPage');

  const passwordMarkup = renderToStaticMarkup(createElement(PasswordInput, { name: 'password', defaultValue: 'test' }));
  assert.match(passwordMarkup, /type="password"/);
  assert.match(passwordMarkup, /type="button"/);
  assert.match(passwordMarkup, /aria-label="Show password"/);
  assert.match(passwordMarkup, /aria-pressed="false"/);
});
