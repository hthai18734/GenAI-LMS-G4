const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseDocument } = require('../../src/utils/document/ChatDocumentParser');
function file(name, text, mimetype = 'text/plain') { return { originalname: name, mimetype, buffer: Buffer.from(text) }; }
test('UTF-8 text is extracted and file name is sanitized', async () => {
  const doc = await parseDocument(file('../lesson.txt', 'Bài học tiếng Việt'));
  assert.equal(doc.name, 'lesson.txt');
  assert.equal(doc.text, 'Bài học tiếng Việt');
  assert.equal(doc.data, undefined);
});
test('Markdown supported', async () => {
  assert.equal((await parseDocument(file('notes.md', '# Summary', 'text/markdown'))).text, '# Summary');
});
test('rejects unsupported, spoofed, empty and excessive files', async () => {
  for (const f of [file('a.exe', 'abc'), file('a.pdf', 'fake', 'application/pdf'), file('a.doc', 'fake', 'application/msword'), file('a.txt', ''), file('a.txt', 'x'.repeat(80001)), file('a.txt', 'text', 'image/png')]) {
    await assert.rejects(parseDocument(f), e => [400, 413].includes(e.status));
  }
});
test('PDF bytes remain private for provider and are not decoded as text', async () => {
  const doc = await parseDocument(file('scan.pdf', '%PDF-1.4\n%%EOF', 'application/pdf'));
  assert.equal(doc.mimeType, 'application/pdf');
  assert.ok(Buffer.isBuffer(doc.data));
  assert.equal(doc.text, undefined);
});

for (const [extension, mimetype] of [['doc', 'application/msword'], ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']]) {
  test(`extracts actual ${extension.toUpperCase()} document in isolated worker`, async () => {
    const buffer = fs.readFileSync(path.join(__dirname, `../fixtures/chat/sample.${extension}`));
    const doc = await parseDocument({ originalname: `sample.${extension}`, mimetype, buffer });
    assert.match(doc.text, /\w{3}/);
    assert.ok(doc.text.length > 20);
  });
}
