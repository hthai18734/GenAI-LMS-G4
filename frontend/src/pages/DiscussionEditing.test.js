import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageUrls = [
  new URL('./CourseLearnPage.jsx', import.meta.url),
  new URL('./TeacherCourseFormPage.jsx', import.meta.url),
];

for (const pageUrl of pageUrls) {
  test(`${pageUrl.pathname.split('/').at(-1)} lets an author edit a discussion post`, async () => {
    const source = await readFile(pageUrl, 'utf8');
    assert.match(source, /const \[editingPost, setEditingPost\] = useState\(null\)/);
    assert.match(source, /discussionService\.updatePost\(editingPost\.id, \{ body \}\)/);
    assert.match(source, /isAuthor[\s\S]*?Edit/);
    assert.match(source, /isReplyAuthor[\s\S]*?Edit/);
  });
}
