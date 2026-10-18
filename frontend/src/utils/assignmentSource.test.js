import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonAssignmentPlans } from './assignmentSource.js';

test('buildLessonAssignmentPlans creates one distinct assignment source per lesson', () => {
  const course = { _id: 'course-1', title: 'Node.js APIs' };
  const lessons = [
    { _id: 'lesson-1', title: 'Routing', content: 'Express routing practice.' },
    { _id: 'lesson-2', title: 'MongoDB', content: 'Mongoose schema practice.' },
  ];
  const plans = buildLessonAssignmentPlans(course, lessons);

  assert.deepEqual(plans.map(plan => plan.lessonId), ['lesson-1', 'lesson-2']);
  assert.deepEqual(plans.map(plan => plan.title), ['Assignment 01 – Routing', 'Assignment 02 – MongoDB']);
  assert.match(plans[0].source, /Express routing practice/);
  assert.doesNotMatch(plans[0].source, /Mongoose schema practice/);
  assert.match(plans[1].source, /Mongoose schema practice/);
});
