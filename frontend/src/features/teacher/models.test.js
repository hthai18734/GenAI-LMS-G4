import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentPayload,
  assignmentToForm,
  validateAssignmentForm,
} from './assignmentModel.js';
import {
  normalizeQuestion,
  quizPayload,
  quizToForm,
  validateQuestion,
  validateQuiz,
} from './quizModel.js';

test('assignment feature model maps, validates, and serializes editor state', () => {
  const form = assignmentToForm({
    courseId: { _id: 'course-1' }, lessonId: { _id: 'lesson-1' },
    title: ' Assignment ', content: ' Instructions ',
  });
  assert.deepEqual(validateAssignmentForm(form), {});
  assert.deepEqual(assignmentPayload(form), {
    title: 'Assignment', content: 'Instructions', lessonId: 'lesson-1',
  });
  assert.equal(form.courseId, 'course-1');
});

test('quiz feature model keeps record mapping separate from page rendering', () => {
  const form = quizToForm({
    title: 'Quiz', lessonId: { _id: 'lesson-1' }, timeLimit: 15, passingScore: 70, attemptLimit: 2,
  });
  assert.deepEqual(validateQuiz(form), {});
  assert.deepEqual(quizPayload(form), {
    title: 'Quiz', lessonId: 'lesson-1', timeLimit: 15, passingScore: 70, attemptLimit: 2,
  });
});

test('question feature model normalizes legacy explanations and validates choices', () => {
  const normalized = normalizeQuestion({ questionText: 'Question?\n\nExplanation:Because.' });
  assert.equal(normalized.questionText, 'Question?');
  assert.equal(normalized.explanation, 'Because.');
  assert.deepEqual(validateQuestion({
    questionText: 'Question?', options: ['A', 'B'], correctAnswer: 'A',
  }), { errors: {}, options: ['A', 'B'] });
});
