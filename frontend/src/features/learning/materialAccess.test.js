import test from 'node:test';
import assert from 'node:assert/strict';
import { performMaterialAccess } from './materialAccess.js';

function browserFixture() {
  const opened = [];
  const revoked = [];
  const browser = {
    URL: { revokeObjectURL: url => revoked.push(url) },
    open(url, target, features) {
      const popup = { url, target, features, opener: {}, location: {}, closed: false, close() { this.closed = true; } };
      opened.push(popup);
      return popup;
    },
    setTimeout(callback) { callback(); },
  };
  return { browser, opened, revoked };
}

test('viewing a material uses the authenticated blob URL and isolates the popup', async () => {
  const fixture = browserFixture();
  const calls = [];
  await performMaterialAccess({ materialId: 'material-1', mode: 'view' }, {
    browser: fixture.browser,
    document: {},
    createObjectUrl: async (id, options) => { calls.push({ id, options }); return 'blob:view'; },
  });
  assert.deepEqual(calls, [{ id: 'material-1', options: { view: true } }]);
  assert.equal(fixture.opened[0].opener, null);
  assert.equal(fixture.opened[0].location.href, 'blob:view');
  assert.deepEqual(fixture.revoked, ['blob:view']);
});

test('downloading a material clicks a temporary download anchor', async () => {
  const fixture = browserFixture();
  const anchor = { clicked: false, removed: false, click() { this.clicked = true; }, remove() { this.removed = true; } };
  const document = { createElement: () => anchor, body: { appendChild(value) { assert.equal(value, anchor); } } };
  await performMaterialAccess({ materialId: 'material-2', filename: 'lesson.pdf', mode: 'download' }, {
    browser: fixture.browser,
    document,
    createObjectUrl: async () => 'blob:download',
  });
  assert.equal(anchor.href, 'blob:download');
  assert.equal(anchor.download, 'lesson.pdf');
  assert.equal(anchor.clicked, true);
  assert.equal(anchor.removed, true);
  assert.deepEqual(fixture.revoked, ['blob:download']);
});

test('failed material access closes the pre-opened preview window', async () => {
  const fixture = browserFixture();
  await assert.rejects(
    performMaterialAccess({ materialId: 'missing', mode: 'view' }, {
      browser: fixture.browser,
      document: {},
      createObjectUrl: async () => { throw new Error('denied'); },
    }),
    /denied/,
  );
  assert.equal(fixture.opened[0].closed, true);
});
