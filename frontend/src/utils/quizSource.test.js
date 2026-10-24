import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonQuizPlans, buildLessonQuizSource } from './quizSource.js';

const course = { _id: 'course-1', title: 'Node.js APIs' };
const lessons = [
  { _id: 'lesson-1', order: 1, title: 'Routing', duration: 45, content: 'Express routes and handlers.' },
  { _id: 'lesson-2', order: 2, title: 'MongoDB', duration: 60, content: 'Schemas and validation.' },
];

test('buildLessonQuizSource uses only the selected lesson', () => {
  const result = buildLessonQuizSource(course, lessons[1]);

  assert.match(result, /Course: Node\.js APIs/);
  assert.match(result, /Lesson: MongoDB/);
  assert.match(result, /Schemas and validation/);
  assert.doesNotMatch(result, /Routing/);
});

test('buildLessonQuizPlans creates one distinct quiz plan per lesson', () => {
  const plans = buildLessonQuizPlans(course, lessons);

  assert.equal(plans.length, 2);
  assert.deepEqual(plans.map(plan => plan.lessonId), ['lesson-1', 'lesson-2']);
  assert.deepEqual(plans.map(plan => plan.title), ['Quiz 01 – Routing', 'Quiz 02 – MongoDB']);
  assert.match(plans[0].source, /Express routes and handlers/);
  assert.doesNotMatch(plans[0].source, /Schemas and validation/);
  assert.match(plans[1].source, /Schemas and validation/);
  assert.doesNotMatch(plans[1].source, /Express routes and handlers/);
});

test('buildLessonQuizPlans rejects a course without lessons', () => {
  assert.throws(() => buildLessonQuizPlans(course, []), /no lessons/i);
});
