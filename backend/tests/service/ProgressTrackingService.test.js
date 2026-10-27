const test = require('node:test');
const assert = require('node:assert/strict');
const { progressTrackingService: ProgressTrackingService } = require('../../src/composition/services');
const ProgressRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/ProgressRepository');
const LessonRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LessonRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const VideoProgressRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/VideoProgressRepository');
const CourseProgressRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseProgressRepository');
const LearningActivityLogRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LearningActivityLogRepository');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');
const ServiceError = require('../../src/service/common/ServiceError');

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
  const origCourseFind = CourseRepository.findById;
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
    isPublished: true,
    videoRef: '/uploads/lesson-videos/lesson.mp4',
  });
  CourseRepository.findById = async () => ({ _id: COURSE_ID, status: 'PUBLIC', deletedAt: null });
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
    const res = await ProgressTrackingService.trackVideoProgress(LESSON_ID, student, {
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
    restore(CourseRepository, { findById: origCourseFind });
    restore(EnrollmentRepository, { findAccessibleEnrollment: origEnrollFind });
    restore(VideoProgressRepository, { findByStudentAndVideo: origVideoFind, saveProgress: origVideoSave });
    restore(ProgressRepository, { upsertProgress: origProgressUpsert });
    restore(LearningActivityLogRepository, { logActivity: origLog });
    ProgressTrackingService.recalculateCourseProgress = origRecalc;
  }
});

test('lesson completion alias enforces the video watch threshold', async () => {
  const originals = {
    lessonFind: LessonRepository.findById,
    courseFind: CourseRepository.findById,
    enrollmentFind: EnrollmentRepository.findAccessibleEnrollment,
    videoFind: VideoProgressRepository.findByStudentAndVideo,
    progressUpsert: ProgressRepository.upsertProgress,
    activityLog: LearningActivityLogRepository.logActivity,
  };
  let progressWritten = false;

  LessonRepository.findById = async () => ({
    _id: LESSON_ID,
    courseId: COURSE_ID,
    isPublished: true,
    videoRef: '/uploads/lesson-videos/lesson.mp4',
    deletedAt: null,
  });
  CourseRepository.findById = async () => ({ _id: COURSE_ID, status: 'PUBLIC', deletedAt: null });
  EnrollmentRepository.findAccessibleEnrollment = async () => ({ _id: 'enrollment-1' });
  VideoProgressRepository.findByStudentAndVideo = async () => ({ completed: false, watchedPercent: 42 });
  ProgressRepository.upsertProgress = async () => { progressWritten = true; };
  LearningActivityLogRepository.logActivity = async () => {};

  try {
    await assert.rejects(
      ProgressTrackingService.markLessonComplete(LESSON_ID, student),
      (error) => error instanceof ServiceError
        && error.status === 400
        && /watch at least 90%/i.test(error.publicMessage),
    );
    assert.equal(progressWritten, false);
  } finally {
    restore(LessonRepository, { findById: originals.lessonFind });
    restore(CourseRepository, { findById: originals.courseFind });
    restore(EnrollmentRepository, { findAccessibleEnrollment: originals.enrollmentFind });
    restore(VideoProgressRepository, { findByStudentAndVideo: originals.videoFind });
    restore(ProgressRepository, { upsertProgress: originals.progressUpsert });
    restore(LearningActivityLogRepository, { logActivity: originals.activityLog });
  }
});

test('video heartbeat binds the route video ID to an accessible published lesson', async () => {
  const originals = {
    lessonFind: LessonRepository.findById,
    courseFind: CourseRepository.findById,
    enrollmentFind: EnrollmentRepository.findAccessibleEnrollment,
    videoSave: VideoProgressRepository.saveProgress,
  };
  let saved = false;
  VideoProgressRepository.saveProgress = async () => { saved = true; };

  try {
    await assert.rejects(
      ProgressTrackingService.trackVideoProgress(LESSON_ID, student, {
        lessonId: '507f1f77bcf86cd799439099',
        positionSec: 5,
        durationSec: 60,
      }),
      (error) => error instanceof ServiceError && error.status === 400,
    );

    LessonRepository.findById = async () => ({
      _id: LESSON_ID,
      courseId: COURSE_ID,
      isPublished: false,
      videoRef: '/uploads/lesson-videos/draft.mp4',
      deletedAt: null,
    });
    await assert.rejects(
      ProgressTrackingService.trackVideoProgress(LESSON_ID, student, {
        lessonId: LESSON_ID,
        positionSec: 5,
        durationSec: 60,
      }),
      (error) => error instanceof ServiceError && error.status === 404,
    );

    LessonRepository.findById = async () => ({
      _id: LESSON_ID,
      courseId: COURSE_ID,
      isPublished: true,
      videoRef: '/uploads/lesson-videos/lesson.mp4',
      deletedAt: null,
    });
    CourseRepository.findById = async () => ({ _id: COURSE_ID, status: 'APPROVED', deletedAt: null });
    EnrollmentRepository.findAccessibleEnrollment = async () => ({ _id: 'enrollment-1' });
    await assert.rejects(
      ProgressTrackingService.trackVideoProgress(LESSON_ID, student, {
        lessonId: LESSON_ID,
        positionSec: 5,
        durationSec: 60,
      }),
      (error) => error instanceof ServiceError && error.status === 404,
    );

    assert.equal(saved, false);
  } finally {
    restore(LessonRepository, { findById: originals.lessonFind });
    restore(CourseRepository, { findById: originals.courseFind });
    restore(EnrollmentRepository, { findAccessibleEnrollment: originals.enrollmentFind });
    restore(VideoProgressRepository, { saveProgress: originals.videoSave });
  }
});
