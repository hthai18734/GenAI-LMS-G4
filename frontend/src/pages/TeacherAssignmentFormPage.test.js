import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./TeacherAssignmentFormPage.jsx', import.meta.url), 'utf8');

test('teacher can load an existing assignment into the form and update it', () => {
  assert.match(source, /teacherService\.getAssignment\(requestedAssignmentId, \{ signal: controller\.signal \}\)/);
  assert.match(source, /return \(\) => controller\.abort\(\)/);
  assert.match(source, /teacherService\.updateAssignment\(editingId, payload\)/);
  assert.match(source, /teacherService\.deleteAssignment\(assignment\._id\)/);
  assert.match(source, /Save Assignment Changes/);
  assert.match(source, /Cancel Editing/);
  assert.match(source, /requestedAssignmentId/);
  assert.match(source, /ReactMarkdown remarkPlugins=\{\[remarkGfm\]\}/);
  assert.match(source, /name="lessonId" value=\{form\.lessonId\} onChange=\{handleChange\}/);
  assert.doesNotMatch(source, /matchingAssignment.*assignments\.find/);
});
