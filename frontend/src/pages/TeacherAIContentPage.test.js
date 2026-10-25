import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./TeacherAIContentPage.jsx', import.meta.url), 'utf8');

test('AI-created lessons explicitly persist their student publication state', () => {
  assert.match(source, /publishLesson:\s*true/);
  assert.match(source, /createLesson\(id,[\s\S]*?isPublished:\s*true/);
  assert.match(source, /createLesson\(target\.courseId,[\s\S]*?isPublished:\s*Boolean\(target\.publishLesson\)/);
  assert.match(source, /updateLesson\(target\.courseId,[\s\S]*?isPublished:\s*Boolean\(target\.publishLesson\)/);
  assert.match(source, /Publish lesson to students/);
});

test('multi-lesson generation exposes completed drafts incrementally and preserves partial results', () => {
  assert.match(source, /Completed \$\{index\} of \$\{plans\.length\}\. Generating quiz/);
  assert.match(source, /Completed \$\{index\} of \$\{plans\.length\}\. Generating assignment/);
  assert.match(source, /setQuizBatch\(\[\.\.\.generated\]\)/);
  assert.match(source, /setAssignmentBatch\(\[\.\.\.generated\]\)/);
  assert.match(source, /completedBatchCount = generated\.length/);
  assert.match(source, /item\(s\) were generated and kept/);
});

test('saving generated content to a live course requires explicit unpublish confirmation', () => {
  assert.match(source, /destinationCourse\?\.status === 'PUBLIC'/);
  assert.match(source, /confirmLabel: 'Unpublish and save'/);
  assert.match(source, /await teacherService\.unpublish\(target\.courseId\)/);
  assert.match(source, /status: 'APPROVED'/);
});
