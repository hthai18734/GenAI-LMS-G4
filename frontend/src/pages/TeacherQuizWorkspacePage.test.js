import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const source = await readFile(new URL('./TeacherQuizWorkspacePage.jsx', import.meta.url), 'utf8');
const courseSource = await readFile(new URL('./TeacherCourseFormPage.jsx', import.meta.url), 'utf8');

test('quiz workspace distinguishes switching quizzes from changing the related lesson', () => {
  assert.match(source, /teacherService\.listQuizzes\(loadedQuiz\.courseId\)/);
  assert.match(source, /Switch quiz/);
  assert.match(source, /navigate\(`\/teacher\/quizzes\/\$\{event\.target\.value\}`\)/);
  assert.match(source, /Selecting another quiz loads that quiz and its own questions/);
  assert.match(source, /name="lessonId" value=\{quizForm\.lessonId\} onChange=\{updateQuiz\}/);
  assert.doesNotMatch(source, /matchingQuiz.*courseQuizzes\.find/);
});

test('course activity assignments have separate edit and submission links for each assignment', async (t) => {
  const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom' });
  t.after(() => server.close());
  const { default: CourseAssignments } = await server.ssrLoadModule('/src/features/teacher/CourseAssignments.jsx');
  assert.match(courseSource, /<CourseAssignments courseId=\{courseId\} assignments=\{assignments\}/);
  const render = assignments => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(CourseAssignments, { courseId: 'course-a', assignments })));
  const markup = render([{ _id: 'a', title: 'First assignment' }, { _id: 'b', title: 'Second assignment' }]);
  for (const id of ['a', 'b']) {
    assert.ok(markup.includes(`href="/teacher/assignments/${id}/edit?courseId=course-a"`));
    assert.ok(markup.includes(`href="/teacher/assignments/${id}/submissions"`));
  }
  assert.match(markup, /Edit assignment<\/a>/);
  assert.match(markup, /View submissions<\/a>/);
  assert.ok(markup.includes('href="/teacher/courses/course-a/gradebook"'));
  const empty = render([]);
  assert.match(empty, /No assignments yet/);
  assert.doesNotMatch(empty, /View submissions/);
  assert.ok(empty.includes('href="/teacher/assignments/new?courseId=course-a"'));
});

test('course activity quizzes have named edit links and a separate creation action, including the empty state', async (t) => {
  const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom' });
  t.after(() => server.close());
  const { default: CourseQuizzes } = await server.ssrLoadModule('/src/features/teacher/CourseQuizzes.jsx');
  const render = quizzes => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(CourseQuizzes, { courseId: 'course-a', quizzes })));
  const markup = render([{ _id: 'quiz-a', title: 'Practice quiz' }, { _id: 'quiz-b', title: 'Review quiz' }]);
  assert.match(markup, /aria-label="Course quizzes"/);
  for (const [id, title] of [['quiz-a', 'Practice quiz'], ['quiz-b', 'Review quiz']]) {
    assert.ok(markup.includes(`aria-label="Edit quiz: ${title}"`));
    assert.ok(markup.includes(`href="/teacher/quizzes/${id}"`));
  }
  assert.match(markup, /Edit quiz<\/a>/);
  assert.ok(markup.includes('href="/teacher/quizzes/new?courseId=course-a"'));
  const empty = render([]);
  assert.match(empty, /No quizzes yet/);
  assert.doesNotMatch(empty, /Edit quiz<\/a>/);
  assert.match(empty, /Create quiz<\/a>/);
});
