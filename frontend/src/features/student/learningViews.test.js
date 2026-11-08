import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('student views render empty sections, active lessons and honest progress error/zero states', async t => {
  const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom' });
  t.after(() => server.close());
  const { default: Sections } = await server.ssrLoadModule('/src/features/student/CourseSectionList.jsx');
  const html = renderToStaticMarkup(createElement(Sections, { sections: [{ id: 's', title: 'Chapter' }, { id: 'empty', title: 'Next' }], lessons: [{ id: 'l', sectionId: 's', title: 'Read', status: 'completed' }], currentLesson: { id: 'l' }, onSelect() {} }));
  assert.match(html, /aria-current="step"/);
  assert.match(html, /1\/1 lessons completed/);
  assert.match(html, /No published lessons in this section yet/);
  const { default: Progress } = await server.ssrLoadModule('/src/features/student/CourseProgressSummary.jsx');
  const error = renderToStaticMarkup(createElement(Progress, { error: 'Access expired', onRefresh() {} }));
  assert.match(error, /role="alert"/);
  assert.doesNotMatch(error, /<progress/);
  const zero = renderToStaticMarkup(createElement(Progress, { progress: { completedRequired: 0, totalRequired: 0, percentage: 0 }, onRefresh() {} }));
  assert.match(zero, /No required activities/);
  assert.match(zero, /value="0"/);
});
