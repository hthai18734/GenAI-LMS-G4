import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentClosed, groupCourseSections, overallLearningProgress } from './learningModel.js';

test('sections keep server order, empty sections and legacy lessons without losing lesson identity', () => {
  const lesson = { id: 'l1', sectionId: 's1', status: 'completed' };
  const groups = groupCourseSections([{ id: 's2', title: 'Empty' }, { id: 's1', title: 'First' }], [lesson, { id: 'old' }]);
  assert.deepEqual(groups.map(s => s.id), ['s2', 's1', 'legacy']);
  assert.equal(groups[0].lessons.length, 0);
  assert.equal(groups[1].lessons[0], lesson);
  assert.equal(groups[2].lessons[0].id, 'old');
});
test('deadline is closed at equality, not one millisecond before, and no deadline remains open', () => {
  const assignment = { deadline: '2026-11-08T10:00:00Z' };
  const now = Date.parse(assignment.deadline);
  assert.equal(assignmentClosed(assignment, now - 1), false);
  assert.equal(assignmentClosed(assignment, now), true);
  assert.equal(assignmentClosed({}, now), false);
});
test('overall progress excludes cancelled courses, deduplicates and does not infer readiness from rounded percentage', () => {
  assert.deepEqual(overallLearningProgress([]), { percentage: 0, total: 0, ready: 0 });
  assert.deepEqual(overallLearningProgress([
    { courseId: 'a', progressPercent: 100, eligibleToComplete: false },
    { courseId: 'a', progressPercent: 100, eligibleToComplete: false },
    { courseId: 'b', progressPercent: 0 },
    { courseId: 'c', progressPercent: 100, enrollmentStatus: 'cancelled' },
  ]), { percentage: 50, total: 2, ready: 0 });
});
