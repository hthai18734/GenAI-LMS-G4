const test = require('node:test');
const assert = require('node:assert/strict');
const { learningStatisticsService: LearningStatisticsService } = require('../../src/composition/services');
const LearningActivityLogRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LearningActivityLogRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const CourseProgressRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseProgressRepository');

const STUDENT_ID = '507f1f77bcf86cd799439011';

function restore(target, originals) {
  Object.assign(target, originals);
}

test('calculateValidStudySeconds unions overlapping tabs and ignores idle gaps', () => {
  const base = new Date('2026-10-01T10:00:00Z');
  const t = (offsetSec) => new Date(base.getTime() + offsetSec * 1000);

  const logs = [
    { startedAt: t(0), endedAt: t(1800) },    // 10:00 - 10:30 (30 mins)
    { startedAt: t(900), endedAt: t(2700) },  // 10:15 - 10:45 (overlapping tab, extends to 45 mins)
  ];

  const validSec = LearningStatisticsService.calculateValidStudySeconds(logs, t(0), t(3600));
  assert.equal(validSec, 2700); // 45 minutes, NOT 60!
});

test('getLearningStatistics handles zero previous period safely without division by zero', async () => {
  const origFindLogs = LearningActivityLogRepository.findStudentIntervals;
  const origCount = LearningActivityLogRepository.countActivities;
  const origEnroll = EnrollmentRepository.findByUserId;

  LearningActivityLogRepository.findStudentIntervals = async () => [];
  LearningActivityLogRepository.countActivities = async () => 0;
  EnrollmentRepository.findByUserId = async () => [];

  try {
    const stats = await LearningStatisticsService.getLearningStatistics(STUDENT_ID, {
      from: '2026-10-01',
      to: '2026-10-07',
    });

    assert.equal(stats.summary.validStudyMinutes, 0);
    assert.equal(stats.summary.currentStreakDays, 0);
    assert.equal(stats.comparison.studyMinutesDeltaPercent, 0.0);
    assert.equal(Array.isArray(stats.daily), true);
  } finally {
    restore(LearningActivityLogRepository, {
      findStudentIntervals: origFindLogs,
      countActivities: origCount,
    });
    EnrollmentRepository.findByUserId = origEnroll;
  }
});
