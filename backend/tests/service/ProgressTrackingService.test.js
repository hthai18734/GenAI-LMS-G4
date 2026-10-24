const test = require('node:test');
const assert = require('node:assert/strict');
const { progressTrackingService: ProgressTrackingService } = require('../../src/composition/services');
const ProgressRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/ProgressRepository');
const LessonRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LessonRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const VideoProgressRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/VideoProgressRepository');
const CourseProgressRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseProgressRepository');
const LearningActivityLogRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LearningActivityLogRepository');

const STUDENT_ID = '507f1f77bcf86cd799439011';
const COURSE_ID = '507f1f77bcf86cd799439012';
const LESSON_ID = '507f1f77bcf86cd799439013';
const student = { _id: STUDENT_ID, role: 'student' };

function restore(target, originals) {
  Object.assign(target, originals);
}

test('mergeIntervals unions overlapping intervals correctly without double counting', () => {
  const intervals = [
    { startSec: 0, endSec: 50 },
    { startSec: 20, endSec: 70 }, // Overlaps [0, 50] -> [0, 70]
    { startSec: 100, endSec: 120 },
  ];
  const merged = ProgressTrackingService.mergeIntervals(intervals);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].startSec, 0);
  assert.equal(merged[0].endSec, 70);
  assert.equal(merged[1].startSec, 100);
  assert.equal(merged[1].endSec, 120);

  const unionSec = ProgressTrackingService.calculateUnionSeconds(intervals);
  assert.equal(unionSec, 70 + 20); // 90 seconds
});

test('trackVideoProgress detects seek and reaches completion when watched percent reaches 90%', async () => {
  const origLessonFind = LessonRepository.findById;
  const origEnrollFind = EnrollmentRepository.findAccessibleEnrollment;
  const origVideoFind = VideoProgressRepository.findByStudentAndVideo;
  const origVideoSave = VideoProgressRepository.saveProgress;
  const origProgressUpsert = ProgressRepository.upsertProgress;
  const origLog = LearningActivityLogRepository.logActivity;
  const origRecalc = ProgressTrackingService.recalculateCourseProgress;

  LessonRepository.findById = async () => ({
    _id: LESSON_ID,
    courseId: COURSE_ID,
    duration: 10, // 10 minutes = 600s
    deletedAt: null,
  });
  EnrollmentRepository.findAccessibleEnrollment = async () => ({ _id: 'enr1' });
  LearningActivityLogRepository.logActivity = async () => {};
  ProgressTrackingService.recalculateCourseProgress = async () => ({ percentage: 90 });

  let savedRecord = null;
  VideoProgressRepository.findByStudentAndVideo = async () => ({
    watchedSegments: [{ startSec: 0, endSec: 535 }],
    completed: false,
    lastSeq: 10,
    sessionId: 'session-1',
  });
  VideoProgressRepository.saveProgress = async (data) => {
    savedRecord = data;
    return data;
  };
  let lessonCompleted = false;
  ProgressRepository.upsertProgress = async (uId, cId, lId, status, opts) => {
    if (status === 'completed' && opts?.source === 'VIDEO') lessonCompleted = true;
  };

  try {
    // Continuous watch 535 -> 540s (crosses 90% threshold of 600s)
    const res = await ProgressTrackingService.trackVideoProgress('vid1', student, {
      lessonId: LESSON_ID,
      sessionId: 'session-1',
      seq: 11,
      durationSec: 600,
      positionSec: 540,
      previousPositionSec: 535,
      playbackRate: 1.0,
      eventType: 'HEARTBEAT',
    });

    assert.equal(res.accepted, true);
    assert.equal(res.completed, true);
    assert.equal(res.watchedPercent, 90);
    assert.equal(lessonCompleted, true);
  } finally {
    restore(LessonRepository, { findById: origLessonFind });
    restore(EnrollmentRepository, { findAccessibleEnrollment: origEnrollFind });
    restore(VideoProgressRepository, { findByStudentAndVideo: origVideoFind, saveProgress: origVideoSave });
    restore(ProgressRepository, { upsertProgress: origProgressUpsert });
    restore(LearningActivityLogRepository, { logActivity: origLog });
    ProgressTrackingService.recalculateCourseProgress = origRecalc;
  }
});
