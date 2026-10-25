import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./TeacherQuizWorkspacePage.jsx', import.meta.url), 'utf8');
const courseSource = await readFile(new URL('./TeacherCourseFormPage.jsx', import.meta.url), 'utf8');

test('quiz workspace distinguishes switching quizzes from changing the related lesson', () => {
  assert.match(source, /teacherService\.listQuizzes\(loadedQuiz\.courseId\)/);
  assert.match(source, /Switch quiz/);
  assert.match(source, /navigate\(`\/teacher\/quizzes\/\$\{event\.target\.value\}`\)/);
  assert.match(source, /Selecting another quiz loads that quiz and its own questions/);
  assert.match(source, /matchingQuiz.*courseQuizzes\.find/);
  assert.match(source, /navigate\(`\/teacher\/quizzes\/\$\{matchingQuiz\._id\}`\)/);
});

test('course activity assignments open directly in edit mode', () => {
  assert.match(courseSource, /assignmentId=\$\{assignment\._id\}/);
});
