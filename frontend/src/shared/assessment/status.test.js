import test from 'node:test';
import assert from 'node:assert/strict';
import { assessmentStatus, submissionStatusOptions } from './status.js';

test('passed has a green label and legacy failure has a red Not passed label', () => {
  assert.deepEqual(assessmentStatus('passed'), { label: 'Passed', className: 'is-passed' });
  assert.deepEqual(assessmentStatus('needs_revision'), { label: 'Not passed', className: 'is-failed' });
  assert.deepEqual(assessmentStatus('not_passed'), assessmentStatus('needs_revision'));
});
test('ungraded and unconfigured scores remain neutral rather than implying a failure', () => {
  for (const state of ['submitted', 'ungraded', 'graded', 'needs_threshold', 'not_submitted']) {
    assert.equal(assessmentStatus(state).className, 'is-pending');
    assert.doesNotMatch(assessmentStatus(state).label, /revision|not passed/i);
  }
});
test('filter uses human labels while preserving existing API query values', () => {
  assert.deepEqual(submissionStatusOptions.map(s => [s.value, s.label]), [
    ['submitted', 'Awaiting grading'], ['graded', 'Graded (passing score not set)'], ['passed', 'Passed'], ['needs_revision', 'Not passed'],
  ]);
});
test('unknown statuses do not expose raw persistence values in the interface', () => {
  assert.deepEqual(assessmentStatus('unrecognized_internal_status'), { label: 'Unknown status', className: 'is-pending' });
});
