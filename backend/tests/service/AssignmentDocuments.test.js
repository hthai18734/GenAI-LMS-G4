const test = require('node:test');
const assert = require('node:assert/strict');
const AssignmentDocumentService = require('../../src/service/learning/AssignmentDocumentService');
const id = '507f1f77bcf86cd799439011';
function make() {
  return new AssignmentDocumentService({
    assignmentRepository: { findById: async () => ({ _id: id, courseId: id, attachment: { storageKey: 'test.pdf', name: 'Prompt.pdf', mimeType: 'application/pdf' } }) },
    assignmentSubmissionRepository: { findById: async () => ({ _id: id, assignmentId: id, studentId: 'owner', attachment: { storageKey: 'answer.pdf', name: 'Answer.pdf', mimeType: 'application/pdf' } }) },
    courseRepository: { findById: async () => ({ _id: id, status: 'PUBLIC', teacherId: 'teacher' }) },
    enrollmentRepository: { findAccessibleEnrollment: async () => ({}) },
    documentStorageGateway: { validDocument: async () => true, resolveWithin: key => `/private/${key}`, exists: () => true, removeBestEffort: () => true },
  });
}
test('private submission download rejects classmates and foreign teachers', async () => {
  const service = make();
  for (const user of [{ _id: 'classmate', role: 'student' }, { _id: 'other', role: 'teacher' }]) {
    await assert.rejects(service.downloadSubmission(id, user), e => e.status === 403);
  }
  assert.equal((await service.downloadSubmission(id, { _id: 'owner', role: 'student' })).fileName, 'Answer.pdf');
  assert.equal((await service.downloadSubmission(id, { _id: 'teacher', role: 'teacher' })).fileName, 'Answer.pdf');
});
test('prompt download requires enrollment and available course for a student', async () => {
  const service = make(); service.enrollmentRepository.findAccessibleEnrollment = async () => null;
  await assert.rejects(service.downloadPrompt(id, { _id: 'student', role: 'student' }), e => e.status === 403);
  service.courseRepository.findById = async () => ({ _id: id, status: 'DRAFT', teacherId: 'teacher' });
  await assert.rejects(service.downloadPrompt(id, { _id: 'student', role: 'student' }), e => e.status === 404);
});
test('file metadata rejects spoofed content and removes storage paths from public metadata', async () => {
  const service = make(); service.documentStorageGateway.validDocument = async () => false;
  await assert.rejects(service.fromUpload({ filename: 'x.pdf', originalname: 'x.pdf', mimetype: 'application/pdf', size: 10 }), e => e.status === 400);
  service.documentStorageGateway.validDocument = async () => true;
  const file = await service.fromUpload({ filename: 'x.pdf', originalname: '../test.pdf', path: '/private/secret.pdf', mimetype: 'application/pdf', size: 10 });
  assert.equal(file.name, 'test.pdf'); assert.equal('path' in file, false);
  await assert.rejects(service.fromUpload({ filename: 'x.pdf', originalname: 'x.pdf', mimetype: 'application/pdf', size: 25 * 1024 * 1024 + 1 }), e => e.status === 400);
});
test('private storage accepts PDF, DOC container and real Word OOXML; rejects a renamed ZIP', async t => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const Storage = require('../../src/infrastructure/storage/AssignmentDocumentStorageGateway');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'assignment-storage-test-'));
  const files = { 'file.pdf': Buffer.from('%PDF-1.4\n%%EOF'), 'file.doc': Buffer.from('d0cf11e0a1b11ae100000000', 'hex'), 'file.docx': require('../fixtures/assignmentDocx'), 'fake.docx': Buffer.from('504b030400000000', 'hex') };
  t.after(() => { for (const name of Object.keys(files)) fs.unlinkSync(path.join(root, name)); fs.rmdirSync(root); });
  for (const [name, bytes] of Object.entries(files)) fs.writeFileSync(path.join(root, name), bytes);
  const gateway = new Storage({ rootDirectory: root });
  assert.equal(await gateway.validDocument('file.pdf', 'application/pdf'), true);
  assert.equal(await gateway.validDocument('file.doc', 'application/msword'), true);
  const wordMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  assert.equal(await gateway.validDocument('file.docx', wordMime), true);
  assert.equal(await gateway.validDocument('fake.docx', wordMime), false);
  assert.equal(await gateway.validDocument('../file.pdf', 'application/pdf'), false);
});
