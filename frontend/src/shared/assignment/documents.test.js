import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentRequestBody, validateAssignmentFile } from './documents.js';
test('assignment request preserves JSON callers and supports file-only multipart submission', () => {
  assert.deepEqual(JSON.parse(assignmentRequestBody({ answer: 'text' })), { answer: 'text' });
  const file = new File(['%PDF-test'], 'Answer.pdf', { type: 'application/pdf' });
  const body = assignmentRequestBody({ answer: '', revision: 3 }, file);
  assert.equal(body.get('file').name, 'Answer.pdf');
  assert.deepEqual(JSON.parse(body.get('data')), { answer: '', revision: 3 });
});
test('file picker rejects unsupported, empty and oversized documents', () => {
  for (const file of [{ name: 'x.exe', size: 10 }, { name: 'x.pdf', size: 0 }, { name: 'x.docx', size: 25 * 1024 * 1024 + 1 }]) assert.throws(() => validateAssignmentFile(file));
  assert.doesNotThrow(() => validateAssignmentFile({ name: 'Answer.DOC', size: 100 }));
});
