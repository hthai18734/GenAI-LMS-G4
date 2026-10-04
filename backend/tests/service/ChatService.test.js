const test = require('node:test');
const assert = require('node:assert/strict');
const ChatService = require('../../src/service/chat/ChatService');
const id = '507f1f77bcf86cd799439011';
const user = { _id: id, role: 'student' };
const input = { text: 'Explain', mode: 'ask', style: 'friendly', requestId: 'request-123' };
function setup() {
  const state = { row: { _id: id, title: 'Chat', turns: [] }, calls: 0, unlocked: 0 };
  const dao = {
    get: async (owner) => (String(owner) === id ? state.row : null),
    lock: async () => ({ row: state.row, token: 'lock' }),
    unlock: async () => {
      state.unlocked++;
    },
    documents: async () => [],
    append: async (owner, conversation, token, turn) => state.row.turns.push(turn),
  };
  const context = { resolve: async () => ({ title: 'Math', content: 'Private source' }) };
  const gemini = {
    generateContent: async (payload) => {
      state.calls++;
      state.payload = payload;
      return { text: 'Answer', model: 'fallback' };
    },
  };
  return { state, dao, context, gemini, service: new ChatService({ dao, context, gemini }) };
}
test('send persists successful pair, includes authorized context, retries idempotently', async () => {
  const { service, state } = setup();
  await service.send(user, id, input);
  await service.send(user, id, input);
  assert.equal(state.calls, 1);
  assert.equal(state.row.turns.length, 1);
  assert.equal(state.row.turns[0].model, 'fallback');
  assert.match(JSON.stringify(state.payload.contents), /Private source/);
  assert.match(JSON.stringify(state.payload.systemInstruction), /gia sư/);
  assert.equal(state.unlocked, 2);
});
test('foreign conversation does not call Gemini', async () => {
  const { service, state } = setup();
  await assert.rejects(
    service.send({ ...user, _id: 'someone-else' }, id, input),
    (e) => e.status === 404,
  );
  assert.equal(state.calls, 0);
});
test('revoked permission blocks history and generation', async () => {
  const { service, context, state } = setup();
  context.resolve = async () => {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  };
  await assert.rejects(service.get(user, id), (e) => e.status === 403);
  await assert.rejects(service.send(user, id, input), (e) => e.status === 403);
  assert.equal(state.calls, 0);
});
test('provider failure releases lock without storing a partial turn', async () => {
  const { service, gemini, state } = setup();
  gemini.generateContent = async () => {
    throw new Error('provider unavailable');
  };
  await assert.rejects(service.send(user, id, input));
  assert.equal(state.row.turns.length, 0);
  assert.equal(state.unlocked, 1);
});
test('conversation limit requires new chat instead of dropping old turns', async () => {
  const { service, state } = setup();
  state.row.turns = Array.from({ length: 40 }, () => ({ requestId: 'old' }));
  await assert.rejects(service.send(user, id, input), (e) => e.status === 409);
  assert.equal(state.calls, 0);
});

test('PDF source uses exactly the uploaded bytes, not the backing buffer', async () => {
  const { service, dao, state } = setup();
  const bytes = Buffer.from('%PDF-1.4\n%%EOF');
  dao.documents = async () => [{ name: 'scan.pdf', mimeType: 'application/pdf', data: bytes }];
  await service.send(user, id, input);
  const part = state.payload.contents.at(-1).parts.find((p) => p.inlineData);
  assert.equal(part.inlineData.data, bytes.toString('base64'));
});

test('history filters by lesson before pagination and returns a continuation cursor', async () => {
  const { service, dao } = setup();
  const context = { courseId: '507f1f77bcf86cd799439012', lessonId: '507f1f77bcf86cd799439013' };
  dao.list = async (owner, actualContext, before) => {
    assert.equal(owner, id);
    assert.deepEqual(actualContext, context);
    assert.equal(before, id);
    return Array.from({ length: 31 }, (_, index) => ({
      _id: String(index),
      title: 'Lesson chat',
      ...context,
    }));
  };
  const result = await service.list(user, { context, before: id });
  assert.equal(result.items.length, 30);
  assert.equal(result.nextCursor, '29');
});

test('upload refuses a fourth attachment before parsing it', async () => {
  const { service, dao, state } = setup();
  dao.documents = async () => [{}, {}, {}];
  await assert.rejects(
    service.upload(user, id, null),
    (e) => e.status === 400 && /3/.test(e.message),
  );
  assert.equal(state.unlocked, 1);
});

test('summary without a lesson or documents asks for a source', async () => {
  const { service, context, state } = setup();
  context.resolve = async () => null;
  await assert.rejects(
    service.send(user, id, { ...input, mode: 'summary' }),
    (e) => e.status === 400,
  );
  assert.equal(state.calls, 0);
});
