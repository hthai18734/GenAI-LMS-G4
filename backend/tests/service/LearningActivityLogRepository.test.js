const test = require('node:test');
const assert = require('node:assert/strict');
const LearningActivityLog = require('../../src/model/learning/LearningActivityLog');
const repository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LearningActivityLogRepository');

test('findStudentIntervals includes logs that overlap the requested boundary', async () => {
  const originalFind = LearningActivityLog.find;
  let capturedFilter;
  LearningActivityLog.find = (filter) => {
    capturedFilter = filter;
    const query = {
      sort: () => query,
      lean: () => query,
      exec: async () => [],
    };
    return query;
  };

  try {
    const from = new Date('2026-10-20T00:00:00.000Z');
    const to = new Date('2026-10-26T23:59:59.999Z');
    await repository.findStudentIntervals('507f1f77bcf86cd799439011', { from, to });
    assert.deepEqual(capturedFilter.startedAt, { $lte: to });
    assert.deepEqual(capturedFilter.endedAt, { $gte: from });
  } finally {
    LearningActivityLog.find = originalFind;
  }
});
