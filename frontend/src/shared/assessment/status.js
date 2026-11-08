const statuses = {
  passed: { label: 'Passed', className: 'is-passed' },
  needs_revision: { label: 'Not passed', className: 'is-failed' },
  not_passed: { label: 'Not passed', className: 'is-failed' },
  submitted: { label: 'Awaiting grading', className: 'is-pending' },
  ungraded: { label: 'Awaiting grading', className: 'is-pending' },
  graded: { label: 'Graded (passing score not set)', className: 'is-pending' },
  needs_threshold: { label: 'Passing score not set', className: 'is-pending' },
  not_submitted: { label: 'Not submitted', className: 'is-pending' },
};
export const assessmentStatus = status => statuses[status] || { label: 'Unknown status', className: 'is-pending' };
export const submissionStatusOptions = ['submitted', 'graded', 'passed', 'needs_revision'].map(value => ({ value, label: assessmentStatus(value).label }));
