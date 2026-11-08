import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeReportRows } from './gradeReport.js';
test('report preserves Vietnamese, zero and incomplete states without interpreting formulas', () => {
  const rows = gradeReportRows({ rows: [{ student: { fullName: '=Học viên', email: 'a@example.test' }, cells: [{ score: 0, maxScore: 10, state: 'not_passed' }, { score: null, state: 'ungraded' }], result: { byType: { LESSON: { completed: 1, total: 2 } }, eligibleToComplete: false, remainingActivities: ['Lesson: Bài 2'] } }] });
  assert.deepEqual(rows[0], ['=Học viên', 'a@example.test', '1/2', '0/10 — Not passed', 'Awaiting grading', 'Incomplete', 'Lesson: Bài 2']);
});
