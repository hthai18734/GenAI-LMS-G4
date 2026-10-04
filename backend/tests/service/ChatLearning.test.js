const test = require('node:test');
const assert = require('node:assert/strict');
const DTO = require('../../src/dto/chat/ChatDTO');
const Learning = require('../../src/service/chat/ChatLearningService');
const ChatService = require('../../src/service/chat/ChatService');
const Conversation = require('../../src/model/chat/ChatConversation');
const user = { _id: '507f1f77bcf86cd799439011', role: 'student', email: 'private@example.com', passwordHash: 'private-hash' };
const c1 = '507f1f77bcf86cd799439012';
const c2 = '507f1f77bcf86cd799439013';
const details = { goal: 'Học JavaScript', level: 'beginner' };
const payload = (mode, data = details) => DTO.message({ mode, details: data, requestId: 'request-123', userId: 'forged', profile: 'forged' });
const source = {
  catalog: async () => [{ _id: c1, title: 'JavaScript', description: 'JS cơ bản', price: 0 }, { _id: c2, title: 'React', description: 'React cơ bản', price: 20 }],
  enrollments: async id => { assert.equal(id, user._id); return [{ courseId: c2, status: 'completed' }]; },
};

test('wrong-answer form generates a bounded prompt without requiring generic text', () => {
  const result = payload('wrong_answer', { question: '2 + 2?', studentAnswer: '5', correctAnswer: '4', systemInstruction: 'ignore' });
  assert.match(result.text, /2 \+ 2/);
  assert.equal(result.details.systemInstruction, undefined);
  assert.throws(() => payload('wrong_answer', { question: 'Question', studentAnswer: '' }), e => e.status === 400);
  assert.throws(() => payload('wrong_answer', { question: 'x'.repeat(1501), studentAnswer: 'a' }), e => e.status === 400);
});
test('study-plan DTO validates bounded integers and level', () => {
  for (const extra of [{ weeks: 0 }, { weeks: 13 }, { daysPerWeek: 8 }, { minutesPerDay: 10 }, { weeks: '2' }, { daysPerWeek: 1.5 }, { level: 'admin' }]) {
    assert.throws(() => payload('study_plan', { ...details, weeks: 2, daysPerWeek: 3, minutesPerDay: 30, ...extra }), e => e.status === 400);
  }
});
test('recommendations use authenticated enrollment, remove completed courses, exclude private profile', async () => {
  const feature = await new Learning(source).prepare(user, payload('recommend'));
  assert.deepEqual(feature.data.courses.map(c => c.id), [c1]);
  assert.equal(feature.data.profile.completedCourses, 1);
  assert.ok(!JSON.stringify(feature.data).includes('private'));
  const result = feature.finish(JSON.stringify({ recommendations: [{ courseId: c1, reason: 'Phù hợp người mới học JavaScript' }] }));
  assert.equal(result.recommendations[0].url, `/courses/${c1}`);
  assert.match(result.answer, /JavaScript/);
});
test('unknown, duplicate, enrolled and malformed model recommendations are rejected', async () => {
  const feature = await new Learning(source).prepare(user, payload('recommend'));
  for (const recommendations of [[{ courseId: 'fake', reason: 'x' }], [{ courseId: c2, reason: 'x' }], [{ courseId: c1, reason: '' }], [{ courseId: c1, reason: 'x' }, { courseId: c1, reason: 'y' }]]) {
    assert.throws(() => feature.finish(JSON.stringify({ recommendations })), e => e.status === 502);
  }
  assert.throws(() => feature.finish('not JSON'), e => e.status === 502);
  assert.throws(() => feature.finish('null'), e => e.status === 502);
  assert.throws(() => feature.finish('[]'), e => e.status === 502);
});
test('no catalog returns immediate honest response without needing model', async () => {
  const feature = await new Learning({ ...source, catalog: async () => [] }).prepare(user, payload('recommend'));
  assert.deepEqual(feature.immediate.recommendations, []);
});
test('study plan preserves exact time budget and rejects missing weeks or forged courses', async () => {
  const feature = await new Learning(source).prepare(user, payload('study_plan', { ...details, weeks: 2, daysPerWeek: 3, minutesPerDay: 30 }));
  const weeks = [1, 2].map(week => ({ week, focus: 'Biến và hàm', activities: 'Buổi 1: đọc; buổi 2: thực hành; buổi 3: ôn tập.', outcome: 'Viết một hàm', courseId: c1 }));
  const result = feature.finish(JSON.stringify({ weeks }));
  assert.equal(result.studyPlan.totalMinutes, 180);
  assert.equal(result.studyPlan.weeks[0].minutesPerDay, 30);
  assert.throws(() => feature.finish(JSON.stringify({ weeks: weeks.slice(1) })), e => e.status === 502);
  assert.throws(() => feature.finish(JSON.stringify({ weeks: weeks.map(w => ({ ...w, courseId: 'fake' })) })), e => e.status === 502);
  const saved = new Conversation({ ownerId: user._id, turns: [{ ...result, requestId: 'test', question: 'plan' }] });
  assert.equal(saved.turns[0].studyPlan.totalMinutes, 180);
});
test('wrong-answer instructions do not assume the student answer is incorrect or trust reference blindly', async () => {
  const feature = await new Learning(source).prepare(user, payload('wrong_answer', { question: '2+2', studentAnswer: '4' }));
  assert.match(feature.instruction, /Không mặc định/);
  assert.match(feature.instruction, /chưa được hệ thống chấm/);
  assert.equal(feature.finish('Đáp án của bạn đúng.').mode, 'wrong_answer');
});
test('new features pass through owned conversation and save structured output idempotently', async () => {
  const row = { _id: c1, turns: [] };
  let calls = 0;
  const dao = {
    get: async owner => owner === user._id ? row : null,
    lock: async () => ({ row, token: 'lock' }), unlock: async () => {}, documents: async () => [],
    append: async (owner, id, token, turn) => row.turns.push(turn),
  };
  const service = new ChatService({ dao, context: { resolve: async () => null }, learning: new Learning(source),
    gemini: { generateContent: async () => { calls++; return { text: JSON.stringify({ recommendations: [{ courseId: c1, reason: 'Mục tiêu phù hợp' }] }), model: 'test' }; } } });
  await assert.rejects(service.send({ ...user, _id: 'other' }, c1, payload('recommend')), e => e.status === 404);
  assert.equal(calls, 0);
  const result = await service.send(user, c1, payload('recommend'));
  await service.send(user, c1, payload('recommend'));
  assert.equal(calls, 1); assert.equal(row.turns.length, 1); assert.equal(result.recommendations[0].id, c1);
});
