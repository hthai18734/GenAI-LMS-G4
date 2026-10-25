import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./TeacherAssignmentFormPage.jsx', import.meta.url), 'utf8');

test('teacher can load an existing assignment into the form and update it', () => {
  assert.match(source, /onClick=\{\(\) => editAssignment\(assignment\)\}/);
  assert.match(source, /teacherService\.updateAssignment\(editingId, payload\)/);
  assert.match(source, /Save Assignment Changes/);
  assert.match(source, /Cancel Editing/);
  assert.match(source, /requestedAssignmentId/);
  assert.match(source, /ReactMarkdown remarkPlugins=\{\[remarkGfm\]\}/);
  assert.match(source, /matchingAssignment.*assignments\.find/);
  assert.match(source, /editAssignment\(matchingAssignment\)/);
});
