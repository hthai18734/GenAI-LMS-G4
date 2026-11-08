import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeReportRows } from './gradeReport.js';
test('report preserves spreadsheet-safe text, zero and incomplete states without interpreting formulas', () => {
  const rows = gradeReportRows({ rows: [{ student: { fullName: '=Student', email: 'a@example.test' }, cells: [{ score: 0, maxScore: 10, state: 'not_passed' }, { score: null, state: 'ungraded' }], result: { byType: { LESSON: { completed: 1, total: 2 } }, eligibleToComplete: false, remainingActivities: ['Lesson: Lesson 2'] } }] });
  assert.deepEqual(rows[0], ['=Student', 'a@example.test', '1/2', '0/10 — Not passed', 'Awaiting grading', 'Incomplete', 'Lesson: Lesson 2']);
});
