const test = require('node:test');
const assert = require('node:assert/strict');
const Conversation = require('../../src/model/chat/ChatConversation');
const chatRepository = require('../../src/infrastructure/persistence/mongoose/repositories/chat/ChatRepository');

test('global history includes all contexts but stays scoped to its owner and cursor', async t => {
  let filter;
  const query = { select() { return this; }, sort() { return this; }, limit() { return this; }, lean() { return []; } };
  t.mock.method(Conversation, 'find', value => { filter = value; return query; });
  await chatRepository.list('owner-a');
  assert.deepEqual(filter, { ownerId: 'owner-a' });
  await chatRepository.list('owner-b', {}, 'cursor');
  assert.deepEqual(filter, { ownerId: 'owner-b', _id: { $lt: 'cursor' } });
  await chatRepository.list('owner-a', { courseId: 'course', lessonId: 'lesson' });
  assert.deepEqual(filter, { ownerId: 'owner-a', courseId: 'course', lessonId: 'lesson' });
});
