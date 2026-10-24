const test = require('node:test');
const assert = require('node:assert/strict');
const ContentGenerationDTO = require('../../src/dto/ai/ContentGenerationDTO');
const ContentGenerationService = require('../../src/service/ai/ContentGenerationService');

test('ContentGenerationDTO validates quiz options', () => {
  const value = ContentGenerationDTO.parse({ type: 'quiz_questions', source: 'Closures retain lexical scope.', count: 8, difficulty: 'hard' });
  assert.equal(value.count, 8);
  assert.equal(value.language, 'English');
  assert.throws(() => ContentGenerationDTO.parse({ type: 'quiz_questions', source: 'content', count: 21 }), /between 1 and 20/);
});

test('ContentGenerationService sends bounded authoring prompt and returns editable content', async () => {
  let request;
  const service = new ContentGenerationService({ gemini: { generateContent: async value => {
    request = value;
    return { text: JSON.stringify({ title: 'Course outline', description: 'Editable result', estimatedDurationHours: 2, prerequisites: 'None', learningOutcomes: ['Learn'], modules: [{ title: 'Module', objective: 'Understand', lessons: [{ title: 'Lesson', objective: 'Practice', durationMinutes: 120 }] }] }), model: 'test-model' };
  } } });
  const result = await service.generate(ContentGenerationDTO.parse({
    type: 'course_outline', source: 'Build an introductory web development course.', language: 'Vietnamese', audience: 'Beginners',
  }));
  assert.equal(result.model, 'test-model');
  assert.match(result.content, /Course outline/);
  assert.equal(request.generationConfig.maxOutputTokens, 8192);
  assert.match(request.systemInstruction.parts[0].text, /requested JSON/);
  assert.match(request.contents[0].parts[0].text, /Vietnamese/);
});

test('course outline returns modules and lessons that can be persisted separately', async () => {
  const payload = { title: 'React', description: 'React course', estimatedDurationHours: 2, prerequisites: 'JavaScript', learningOutcomes: ['Build an app'], modules: [
    { title: 'Basics', objective: 'Learn components', lessons: [{ title: 'Components', objective: 'Create a component', durationMinutes: 60 }, { title: 'Props', objective: 'Pass data', durationMinutes: 60 }] },
  ] };
  const service = new ContentGenerationService({ gemini: { generateContent: async () => ({ text: JSON.stringify(payload), model: 'test' }) } });
  const result = await service.generate(ContentGenerationDTO.parse({ type: 'course_outline', source: 'React course' }));
  assert.equal(result.artifact.modules[0].lessons.length, 2);
  assert.match(result.content, /1\.2 Props/);
});

test('quiz generation returns validated structured questions for persistence', async () => {
  const payload = { title: 'HTML Basics', questions: [
    { questionText: 'Which element creates a link?', options: ['a', 'p', 'h1', 'div'], correctAnswer: 'a', explanation: 'The anchor element creates links.' },
  ] };
  const service = new ContentGenerationService({ gemini: { generateContent: async () => ({ text: JSON.stringify(payload), model: 'test' }) } });
  const result = await service.generate(ContentGenerationDTO.parse({ type: 'quiz_questions', source: 'HTML links use anchors.', count: 1 }));
  assert.equal(result.artifact.questions[0].correctAnswer, 'a');
  assert.match(result.content, /HTML Basics/);
});

test('Chinese generation retries when the model follows the Vietnamese source language', async () => {
  let calls = 0;
  const vietnamese = { title: 'React cơ bản', description: 'Khóa học dành cho người mới', estimatedDurationHours: 2, prerequisites: 'JavaScript', learningOutcomes: ['Xây dựng ứng dụng'], modules: [
    { title: 'Nhập môn', objective: 'Hiểu React', lessons: [{ title: 'Component', objective: 'Tạo component', durationMinutes: 120 }] },
  ] };
  const chinese = { title: 'React 核心课程', description: '面向初学者的完整课程内容', estimatedDurationHours: 2, prerequisites: '具备 JavaScript 基础知识', learningOutcomes: ['能够构建完整的前端应用程序'], modules: [
    { title: '基础概念与实践', objective: '理解组件设计与数据传递方法', lessons: [{ title: '组件开发基础', objective: '创建并组合可复用的用户界面组件', durationMinutes: 120 }] },
  ] };
  const service = new ContentGenerationService({ gemini: { generateContent: async request => {
    calls += 1;
    if (calls === 2) assert.match(request.contents.at(-1).parts[0].text, /zh-CN/);
    return { text: JSON.stringify(calls === 1 ? vietnamese : chinese), model: 'test' };
  } } });
  const result = await service.generate(ContentGenerationDTO.parse({ type: 'course_outline', source: 'Khóa học React', language: 'Chinese' }));
  assert.equal(calls, 2);
  assert.match(result.content, /核心课程/);
});
