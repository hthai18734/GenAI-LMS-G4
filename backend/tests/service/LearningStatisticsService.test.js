const test = require('node:test');
const assert = require('node:assert/strict');
const { learningStatisticsService: LearningStatisticsService } = require('../../src/composition/services');
const LearningActivityLogRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LearningActivityLogRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const CourseProgressRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseProgressRepository');
const ProgressRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/ProgressRepository');

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
  const origFindCompleted = ProgressRepository.findCompletedInRange;

  LearningActivityLogRepository.findStudentIntervals = async () => [];
  LearningActivityLogRepository.countActivities = async () => 0;
  EnrollmentRepository.findByUserId = async () => [];
  ProgressRepository.findCompletedInRange = async () => [];

  try {
    const stats = await LearningStatisticsService.getLearningStatistics(STUDENT_ID, {
      from: '2026-10-01',
      to: '2026-10-07',
    });

    assert.equal(stats.summary.validStudyMinutes, 0);
    assert.equal(stats.summary.currentStreakDays, 0);
    assert.equal(stats.summary.longestStreak, 0);
    assert.equal(stats.comparison.studyMinutesDeltaPercent, 0.0);
    assert.equal(Array.isArray(stats.daily), true);
  } finally {
    restore(LearningActivityLogRepository, {
      findStudentIntervals: origFindLogs,
      countActivities: origCount,
    });
    EnrollmentRepository.findByUserId = origEnroll;
    ProgressRepository.findCompletedInRange = origFindCompleted;
  }
});

test('getLearningStatistics returns the longest streak in the selected period', async () => {
  const origFindLogs = LearningActivityLogRepository.findStudentIntervals;
  const origCount = LearningActivityLogRepository.countActivities;
  const origEnroll = EnrollmentRepository.findByUserId;
  const origFindCompleted = ProgressRepository.findCompletedInRange;
  const logs = [
    ['2026-10-01', 600],
    ['2026-10-02', 900],
    ['2026-10-04', 600],
  ].map(([date, activeSeconds]) => ({
    date,
    activityType: 'LESSON_ACTIVE',
    activeSeconds,
    startedAt: new Date(`${date}T10:00:00Z`),
    endedAt: new Date(new Date(`${date}T10:00:00Z`).getTime() + activeSeconds * 1000),
  }));
  let calls = 0;
  LearningActivityLogRepository.findStudentIntervals = async () => (calls++ === 0 ? logs : []);
  LearningActivityLogRepository.countActivities = async () => 3;
  EnrollmentRepository.findByUserId = async () => [];
  ProgressRepository.findCompletedInRange = async () => [];

  try {
    const stats = await LearningStatisticsService.getLearningStatistics(STUDENT_ID, {
      from: '2026-10-01T00:00:00Z',
      to: '2026-10-05T23:59:59Z',
    });
    assert.equal(stats.summary.longestStreak, 2);
  } finally {
    restore(LearningActivityLogRepository, {
      findStudentIntervals: origFindLogs,
      countActivities: origCount,
    });
    EnrollmentRepository.findByUserId = origEnroll;
    ProgressRepository.findCompletedInRange = origFindCompleted;
  }
});

test('completion events update activity days and streaks without inventing study minutes', async () => {
  const origFindLogs = LearningActivityLogRepository.findStudentIntervals;
  const origCount = LearningActivityLogRepository.countActivities;
  const origEnroll = EnrollmentRepository.findByUserId;
  const origFindCompleted = ProgressRepository.findCompletedInRange;
  const completedAt = new Date('2026-10-05T10:00:00Z');
  const event = {
    date: '2026-10-05',
    activityType: 'LESSON_ACTIVE',
    activeSeconds: 0,
    startedAt: completedAt,
    endedAt: completedAt,
  };
  let calls = 0;
  LearningActivityLogRepository.findStudentIntervals = async () => (calls++ === 0 ? [event] : []);
  LearningActivityLogRepository.countActivities = async () => 1;
  EnrollmentRepository.findByUserId = async () => [];
  ProgressRepository.findCompletedInRange = async () => [];

  try {
    const stats = await LearningStatisticsService.getLearningStatistics(STUDENT_ID, {
      from: '2026-10-05',
      to: '2026-10-05',
    });
    assert.equal(stats.summary.totalMinutes, 0);
    assert.equal(stats.summary.activeDays, 1);
    assert.equal(stats.summary.currentStreak, 1);
    assert.equal(stats.summary.longestStreak, 1);
    assert.equal(stats.summary.lessonsCompleted, 1);
  } finally {
    restore(LearningActivityLogRepository, {
      findStudentIntervals: origFindLogs,
      countActivities: origCount,
    });
    EnrollmentRepository.findByUserId = origEnroll;
    ProgressRepository.findCompletedInRange = origFindCompleted;
  }
});

test('legacy completed progress updates activity statistics without adding study minutes or duplicating logged lessons', async () => {
  const origFindLogs = LearningActivityLogRepository.findStudentIntervals;
  const origCount = LearningActivityLogRepository.countActivities;
  const origEnroll = EnrollmentRepository.findByUserId;
  const origFindCompleted = ProgressRepository.findCompletedInRange;
  const firstLessonId = '507f1f77bcf86cd799439012';
  const secondLessonId = '507f1f77bcf86cd799439013';
  const completedAt = new Date('2026-10-05T10:00:00Z');
  const loggedEvent = {
    lessonId: firstLessonId,
    date: '2026-10-05',
    activityType: 'LESSON_ACTIVE',
    activeSeconds: 0,
    startedAt: completedAt,
    endedAt: completedAt,
  };
  let logCalls = 0;
  LearningActivityLogRepository.findStudentIntervals = async () => (logCalls++ === 0 ? [loggedEvent] : []);
  LearningActivityLogRepository.countActivities = async () => 1;
  ProgressRepository.findCompletedInRange = async () => [
    { lessonId: firstLessonId, completedAt },
    { lessonId: secondLessonId, completedAt },
  ];
  EnrollmentRepository.findByUserId = async () => [];

  try {
    const stats = await LearningStatisticsService.getLearningStatistics(STUDENT_ID, {
      from: '2026-10-05',
      to: '2026-10-05',
    });
    assert.equal(stats.summary.totalMinutes, 0);
    assert.equal(stats.summary.activeDays, 1);
    assert.equal(stats.summary.currentStreak, 1);
    assert.equal(stats.summary.lessonsCompleted, 2);
    assert.equal(stats.daily.find((day) => day.date === '2026-10-05').completedActivities, 2);
  } finally {
    restore(LearningActivityLogRepository, {
      findStudentIntervals: origFindLogs,
      countActivities: origCount,
    });
    EnrollmentRepository.findByUserId = origEnroll;
    ProgressRepository.findCompletedInRange = origFindCompleted;
  }
});

test('duplicate legacy LESSON_ACTIVE logs for one lesson count as one completion', async () => {
  const origFindLogs = LearningActivityLogRepository.findStudentIntervals;
  const origEnroll = EnrollmentRepository.findByUserId;
  const origFindCompleted = ProgressRepository.findCompletedInRange;
  const lessonId = '507f1f77bcf86cd799439012';
  const completedAt = new Date('2026-10-05T10:00:00Z');
  const duplicateLogs = [1, 2].map((suffix) => ({
    _id: `activity-${suffix}`,
    lessonId,
    date: '2026-10-05',
    activityType: 'LESSON_ACTIVE',
    activeSeconds: 0,
    startedAt: completedAt,
    endedAt: completedAt,
  }));
  let calls = 0;
  LearningActivityLogRepository.findStudentIntervals = async () => (calls++ === 0 ? duplicateLogs : []);
  ProgressRepository.findCompletedInRange = async () => [{ lessonId, completedAt }];
  EnrollmentRepository.findByUserId = async () => [];

  try {
    const stats = await LearningStatisticsService.getLearningStatistics(STUDENT_ID, {
      from: '2026-10-05T00:00:00Z',
      to: '2026-10-05T23:59:59Z',
    });
    assert.equal(stats.summary.lessonsCompleted, 1);
    assert.equal(stats.daily.find((day) => day.date === '2026-10-05').completedActivities, 1);
  } finally {
    LearningActivityLogRepository.findStudentIntervals = origFindLogs;
    EnrollmentRepository.findByUserId = origEnroll;
    ProgressRepository.findCompletedInRange = origFindCompleted;
  }
});

test('default week uses exactly seven Ho Chi Minh calendar days including local today', async () => {
  const origFindLogs = LearningActivityLogRepository.findStudentIntervals;
  const origEnroll = EnrollmentRepository.findByUserId;
  const origFindCompleted = ProgressRepository.findCompletedInRange;
  const origNow = LearningStatisticsService.now;
  LearningActivityLogRepository.findStudentIntervals = async () => [];
  ProgressRepository.findCompletedInRange = async () => [];
  EnrollmentRepository.findByUserId = async () => [];
  LearningStatisticsService.now = () => new Date('2026-10-25T18:30:00.000Z'); // 26 Oct 01:30 in Vietnam

  try {
    const stats = await LearningStatisticsService.getLearningStatistics(STUDENT_ID, {
      range: 'week',
      tz: 'Asia/Ho_Chi_Minh',
    });
    assert.deepEqual(stats.daily.map((day) => day.date), [
      '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23',
      '2026-10-24', '2026-10-25', '2026-10-26',
    ]);
  } finally {
    LearningActivityLogRepository.findStudentIntervals = origFindLogs;
    EnrollmentRepository.findByUserId = origEnroll;
    ProgressRepository.findCompletedInRange = origFindCompleted;
    LearningStatisticsService.now = origNow;
  }
});

test('default month uses exactly thirty local calendar days', async () => {
  const origFindLogs = LearningActivityLogRepository.findStudentIntervals;
  const origEnroll = EnrollmentRepository.findByUserId;
  const origFindCompleted = ProgressRepository.findCompletedInRange;
  const origNow = LearningStatisticsService.now;
  LearningActivityLogRepository.findStudentIntervals = async () => [];
  ProgressRepository.findCompletedInRange = async () => [];
  EnrollmentRepository.findByUserId = async () => [];
  LearningStatisticsService.now = () => new Date('2026-10-25T18:30:00.000Z');

  try {
    const stats = await LearningStatisticsService.getLearningStatistics(STUDENT_ID, {
      range: 'month',
      tz: 'Asia/Ho_Chi_Minh',
    });
    assert.equal(stats.daily.length, 30);
    assert.equal(stats.daily[0].date, '2026-09-27');
    assert.equal(stats.daily.at(-1).date, '2026-10-26');
  } finally {
    LearningActivityLogRepository.findStudentIntervals = origFindLogs;
    EnrollmentRepository.findByUserId = origEnroll;
    ProgressRepository.findCompletedInRange = origFindCompleted;
    LearningStatisticsService.now = origNow;
  }
});

test('full ISO timestamps are converted to their local calendar date', async () => {
  const origFindLogs = LearningActivityLogRepository.findStudentIntervals;
  const origEnroll = EnrollmentRepository.findByUserId;
  const origFindCompleted = ProgressRepository.findCompletedInRange;
  const eventAt = new Date('2026-10-25T18:30:00.000Z');
  let calls = 0;
  LearningActivityLogRepository.findStudentIntervals = async () => (calls++ === 0 ? [{
    _id: 'local-date-event',
    activityType: 'COURSE_COMPLETE',
    startedAt: eventAt,
    endedAt: eventAt,
    activeSeconds: 0,
    date: '2026-10-25',
  }] : []);
  ProgressRepository.findCompletedInRange = async () => [];
  EnrollmentRepository.findByUserId = async () => [];

  try {
    const stats = await LearningStatisticsService.getLearningStatistics(STUDENT_ID, {
      from: '2026-10-25T18:30:00.000Z',
      to: '2026-10-25T19:30:00.000Z',
      tz: 'Asia/Ho_Chi_Minh',
    });
    assert.deepEqual(stats.daily.map((day) => day.date), ['2026-10-26']);
    assert.equal(stats.daily[0].completedActivities, 1);
  } finally {
    LearningActivityLogRepository.findStudentIntervals = origFindLogs;
    EnrollmentRepository.findByUserId = origEnroll;
    ProgressRepository.findCompletedInRange = origFindCompleted;
  }
});

test('invalid date-only calendar values are rejected', async () => {
  await assert.rejects(
    LearningStatisticsService.getLearningStatistics(STUDENT_ID, {
      from: '2026-02-30',
      to: '2026-03-02',
      tz: 'Asia/Ho_Chi_Minh',
    }),
    (error) => error.status === 422 && /date/i.test(error.message)
  );
});
