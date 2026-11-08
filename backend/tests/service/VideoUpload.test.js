const test = require('node:test');
const assert = require('node:assert/strict');
const LessonVideoService = require('../../src/service/learning/LessonVideoService');
test('an uploaded reference cannot attach to another course or teacher and failed saves discard pending data', async () => {
  let removed = false;
  const service = new LessonVideoService({ videoUploadRepository: { find: async () => ({ ownerId: 't', courseId: 'c', filename: 'test.mp4', expiresAt: new Date(Date.now() + 10000) }), remove: async () => {} },
    videoStorageGateway: { resolveWithin: x => x, removeBestEffort: () => { removed = true; } }, lessonRepository: { findByVideoRef: async () => null } });
  await assert.rejects(service.prepareReference('other', { _id: 't' }, '/uploads/lesson-videos/test.mp4'), e => e.status === 403);
  await assert.rejects(service.prepareReference('c', { _id: 'other' }, '/uploads/lesson-videos/test.mp4'), e => e.status === 403);
  await service.discard('test.mp4', { _id: 't' }); assert.equal(removed, true);
});
test('failed storage deletion retains registry for the next sweep; metadata failures discard new uploads', async () => {
  let registryRemoved = false;
  const service = new LessonVideoService({ videoUploadRepository: { find: async () => ({ ownerId: 't' }), remove: async () => { registryRemoved = true; } },
    videoStorageGateway: { resolveWithin: x => x, removeBestEffort: () => false }, lessonRepository: { findByVideoRef: async () => null } });
  await service.discard('test.mp4', { _id: 't' }); assert.equal(registryRemoved, false);
  service.prepareReference = async () => ({ mimeType: 'video/mp4' });
  service.videoStorage.removeBestEffort = () => true;
  await assert.rejects(service.withMetadata('c', { _id: 't' }, { videoRef: '/uploads/lesson-videos/test.mp4' }, null, async () => { throw new Error('DB unavailable'); }), /DB unavailable/);
  assert.equal(registryRemoved, true);
  registryRemoved = false;
  await assert.rejects(service.withMetadata('c', { _id: 't' }, { videoRef: '/uploads/lesson-videos/test.mp4' }, null, async () => null), e => e.status === 409);
  assert.equal(registryRemoved, true);
});
test('unregistered expired files left after DB failure are retried by storage sweep', async () => {
  let removed = false;
  const service = new LessonVideoService({ videoUploadRepository: { expired: async () => [], find: async () => null }, lessonRepository: { findByVideoRef: async () => null },
    videoStorageGateway: { expiredVideoFilenames: () => ['old.mp4'], resolveWithin: x => x, removeBestEffort: () => { removed = true; } } });
  await service.cleanupAbandoned(); assert.equal(removed, true);
});
