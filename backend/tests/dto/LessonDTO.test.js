const test = require('node:test');
const assert = require('node:assert/strict');
const LessonDTO = require('../../src/dto/course/LessonDTO');

test('lesson DTO accepts the lesson editor payload and preserves publication and video fields', () => {
  const body = { title: ' Lesson ', content: ' Notes ', order: 1, duration: 11, videoRef: '', isPublished: false };
  const dto = new LessonDTO(body);
  assert.deepEqual(dto.validate(), {});
  assert.deepEqual(dto.toObject(), { ...body, title: 'Lesson', content: 'Notes', videoRef: null });
  const update = new LessonDTO({ videoRef: '/uploads/lesson-videos/test.mp4', isPublished: true }, { partial: true });
  assert.deepEqual(update.validate(), {});
  assert.equal(update.toObject().isPublished, true);
});

test('lesson DTO rejects invalid publication flags, video references and protected fields', () => {
  for (const videoRef of [123, 'javascript:alert(1)', '/uploads/materials/private.pdf', 'ftp://example.com/video.mp4']) {
    assert.ok(new LessonDTO({ videoRef }, { partial: true }).validate().videoRef);
  }
  assert.ok(new LessonDTO({ isPublished: 'false' }, { partial: true }).validate().isPublished);
  assert.ok(new LessonDTO({ deletedAt: new Date() }, { partial: true }).validate().payload);
  for (const videoRef of ['https://youtu.be/example', 'https://example.com/video.mp4', null]) {
    assert.deepEqual(new LessonDTO({ videoRef }, { partial: true }).validate(), {});
  }
});
