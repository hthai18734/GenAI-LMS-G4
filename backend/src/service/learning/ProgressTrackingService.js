const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const { COURSE_STATUS } = require('../../domain/learning/CourseStatus');
const ServiceError = require('../common/ServiceError');

const DEFAULT_WEIGHTS = { LESSON: 40, QUIZ: 30, ASSIGNMENT: 30 };
const VIDEO_COMPLETION_THRESHOLD = 90; // 90%
const MAX_PLAYBACK_RATE = 2.0;
const POSITION_TOLERANCE_SEC = 3.0;

class ProgressTrackingService {
  constructor({ progressRepository, courseRepository, lessonRepository, quizRepository, quizAttemptRepository, assignmentRepository, assignmentSubmissionRepository, enrollmentRepository, videoProgressRepository, courseProgressRepository, learningActivityLogRepository, learningGoalRepository } = {}) {
    this.progressRepository = progressRepository;
    this.courseRepository = courseRepository;
    this.lessonRepository = lessonRepository;
    this.quizRepository = quizRepository;
    this.quizAttemptRepository = quizAttemptRepository;
    this.assignmentRepository = assignmentRepository;
    this.assignmentSubmissionRepository = assignmentSubmissionRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.videoProgressRepository = videoProgressRepository;
    this.courseProgressRepository = courseProgressRepository;
    this.learningActivityLogRepository = learningActivityLogRepository;
    this.learningGoalRepository = learningGoalRepository;
  }
  assertValidId(id, field = 'ID') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} is invalid.`);
  }

  // ─── Union interval merge algorithm (I3-05 Core) ──────────────────
  mergeIntervals(intervals) {
    if (!intervals || !intervals.length) return [];
    const sorted = [...intervals].sort((a, b) => a.startSec - b.startSec);
    const merged = [];
    for (const cur of sorted) {
      if (!merged.length) {
        merged.push({ startSec: Math.max(0, cur.startSec), endSec: Math.max(0, cur.endSec) });
        continue;
      }
      const last = merged[merged.length - 1];
      if (cur.startSec <= last.endSec + 0.5) {
        last.endSec = Math.max(last.endSec, cur.endSec);
      } else {
        merged.push({ startSec: Math.max(0, cur.startSec), endSec: Math.max(0, cur.endSec) });
      }
    }
    return merged;
  }

  calculateUnionSeconds(intervals) {
    const merged = this.mergeIntervals(intervals);
    return Math.round(merged.reduce((acc, seg) => acc + Math.max(0, seg.endSec - seg.startSec), 0));
  }

  // ─── I3-03: Mark Lesson Complete ──────────────────────────────────
  async markLessonComplete(lessonId, user) {
    this.assertValidId(lessonId, 'Lesson ID');
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || lesson.deletedAt) throw new ServiceError(404, 'Lesson not found.');
    if (!lesson.isPublished) throw new ServiceError(404, 'Lesson is not published.');

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course || course.deletedAt || course.status !== COURSE_STATUS.PUBLIC) {
      throw new ServiceError(404, 'Course is not available for learning.');
    }

    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, lesson.courseId);
    if (!enrollment) {
      throw new ServiceError(403, 'You must be enrolled in this course to complete this lesson.');
    }

    if (lesson.videoRef) {
      const videoProgress = await this.videoProgressRepository.findByStudentAndVideo(user._id, String(lesson._id));
      const watchedPercent = Number(videoProgress?.watchedPercent) || 0;
      if (!videoProgress?.completed && watchedPercent < VIDEO_COMPLETION_THRESHOLD) {
        throw new ServiceError(400, 'Please watch at least 90% of the lesson video before completing this lesson.');
      }
    }

    // Upsert lesson completion
    await this.progressRepository.upsertProgress(user._id, lesson.courseId, lessonId, 'completed', { source: 'MANUAL' });

    // Log study activity
    const now = new Date();
    const started = new Date(now.getTime() - 5 * 60 * 1000);
    await this.learningActivityLogRepository.logActivity({
      studentId: user._id,
      courseId: lesson.courseId,
      lessonId,
      activityType: 'LESSON_ACTIVE',
      startedAt: started,
      endedAt: now,
      activeSeconds: (lesson.duration || 5) * 60,
      date: now.toISOString().split('T')[0],
    });

    // Recalculate authoritative course progress
    const progress = await this.recalculateCourseProgress(user._id, lesson.courseId);

    return {
      completed: true,
      lessonId: String(lessonId),
      courseProgress: progress,
    };
  }

  // ─── I3-04: View Progress ─────────────────────────────────────────
  async viewCourseProgress(courseId, user) {
    this.assertValidId(courseId, 'Course ID');
    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, courseId);
    if (!enrollment) {
      throw new ServiceError(403, 'You must be enrolled in this course to view progress.');
    }

    const cached = await this.recalculateCourseProgress(user._id, courseId);

    return {
      courseId: String(courseId),
      percentage: cached.percentage,
      eligibleToComplete: cached.eligibleToComplete,
      completedRequired: cached.completedRequired,
      totalRequired: cached.totalRequired,
      byType: cached.byType,
      remainingActivities: cached.remainingActivities,
      lastCalculatedAt: cached.lastCalculatedAt,
    };
  }

  // ─── I3-05: Track Video Progress (Medium) ─────────────────────────
  async trackVideoProgress(videoId, user, payload = {}) {
    if (!videoId) throw new ServiceError(400, 'videoId is required.');
    this.assertValidId(videoId, 'Video ID');
    if (payload.lessonId !== undefined && String(payload.lessonId) !== String(videoId)) {
      throw new ServiceError(400, 'lessonId must match the requested video lesson.');
    }

    const lesson = await this.lessonRepository.findById(videoId);
    if (!lesson || lesson.deletedAt || !lesson.isPublished || !lesson.videoRef) {
      throw new ServiceError(404, 'Lesson video not found.');
    }

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course || course.deletedAt || course.status !== COURSE_STATUS.PUBLIC) {
      throw new ServiceError(404, 'Course is not available for learning.');
    }

    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, lesson.courseId);
    if (!enrollment) {
      throw new ServiceError(403, 'You must be enrolled in this course to track video playback.');
    }

    const {
      sessionId = 'session-default',
      seq = 1,
      eventType = 'HEARTBEAT',
      playbackRate = 1.0,
    } = payload;

    const rawPos = payload.positionSec !== undefined ? Number(payload.positionSec) : (payload.currentTime !== undefined ? Number(payload.currentTime) : 0);
    const rawPrevPos = payload.previousPositionSec !== undefined ? Number(payload.previousPositionSec) : (rawPos > 0 ? Math.max(0, rawPos - 5) : 0);
    const rawDuration = payload.durationSec !== undefined ? Number(payload.durationSec) : (payload.duration !== undefined ? Number(payload.duration) : 0);

    const duration = Math.max(rawDuration || (lesson.duration ? lesson.duration * 60 : 0), 1);
    const pos = Math.max(0, Math.min(rawPos, duration));
    const prevPos = Math.max(0, Math.min(rawPrevPos, duration));

    const canonicalVideoId = String(lesson._id);
    let record = await this.videoProgressRepository.findByStudentAndVideo(user._id, canonicalVideoId);
    const existingSegments = record?.watchedSegments || [];

    // Deduplication check for same session and non-monotonic seq
    if (record && record.sessionId === sessionId && seq <= record.lastSeq && eventType === 'HEARTBEAT') {
      return {
        accepted: true,
        resumePositionSec: record.resumePositionSec,
        watchedSeconds: record.watchedSeconds,
        watchedPercent: record.watchedPercent,
        completed: record.completed,
      };
    }

    // Determine continuous playback vs seek
    const positionDelta = pos - prevPos;
    const maxExpectedAdvance = 5.0 * Math.min(playbackRate || 1.0, MAX_PLAYBACK_RATE) + POSITION_TOLERANCE_SEC;

    let candidateInterval = null;
    if (eventType !== 'SEEK' && positionDelta >= 0 && positionDelta <= maxExpectedAdvance) {
      candidateInterval = { startSec: prevPos, endSec: pos };
    }

    const updatedSegments = candidateInterval
      ? this.mergeIntervals([...existingSegments, candidateInterval])
      : this.mergeIntervals(existingSegments);

    const unionSeconds = this.calculateUnionSeconds(updatedSegments);
    const percent = Math.min(100, Math.round((unionSeconds / duration) * 1000) / 10);
    const crossedThreshold = percent >= VIDEO_COMPLETION_THRESHOLD;
    const wasAlreadyCompleted = Boolean(record?.completed);
    const isNowCompleted = wasAlreadyCompleted || crossedThreshold;

    const saved = await this.videoProgressRepository.saveProgress({
      studentId: user._id,
      videoId: canonicalVideoId,
      lessonId: lesson._id,
      courseId: lesson.courseId,
      durationSec: duration,
      watchedSegments: updatedSegments,
      watchedSeconds: unionSeconds,
      watchedPercent: percent,
      resumePositionSec: pos,
      completed: isNowCompleted,
      completedAt: isNowCompleted && !wasAlreadyCompleted ? new Date() : record?.completedAt,
      lastSeq: seq,
      sessionId,
    });

    // If threshold crossed for the first time, complete lesson and update progress
    if (crossedThreshold && !wasAlreadyCompleted) {
      await this.progressRepository.upsertProgress(user._id, lesson.courseId, lesson._id, 'completed', {
        source: 'VIDEO',
        lastPositionSec: pos,
      });

      // Log video watch activity
      const now = new Date();
      await this.learningActivityLogRepository.logActivity({
        studentId: user._id,
        courseId: lesson.courseId,
        lessonId: lesson._id,
        activityType: 'VIDEO_WATCH',
        startedAt: new Date(now.getTime() - unionSeconds * 1000),
        endedAt: now,
        activeSeconds: unionSeconds,
        date: now.toISOString().split('T')[0],
      });

      await this.recalculateCourseProgress(user._id, lesson.courseId);
    }

    return {
      accepted: true,
      resumePositionSec: saved.resumePositionSec,
      watchedSeconds: saved.watchedSeconds,
      watchedPercent: saved.watchedPercent,
      completed: saved.completed,
    };
  }

  async getVideoProgress(videoId, user) {
    if (!videoId) throw new ServiceError(400, 'videoId is required.');
    const record = await this.videoProgressRepository.findByStudentAndVideo(user._id, videoId);
    if (!record) {
      return { resumePositionSec: 0, watchedSeconds: 0, watchedPercent: 0, completed: false };
    }
    return {
      resumePositionSec: record.resumePositionSec,
      watchedSeconds: record.watchedSeconds,
      watchedPercent: record.watchedPercent,
      completed: record.completed,
    };
  }

  // ─── I3-06: Calculate Course Progress (Medium) ────────────────────
  async recalculateCourseProgress(studentId, courseId) {
    this.assertValidId(studentId, 'Student ID');
    this.assertValidId(courseId, 'Course ID');

    // 1. Fetch activities
    const [lessons, quizzes, assignments, progressRecords, passedAssignmentIds] = await Promise.all([
      this.lessonRepository.findByCourseId(courseId),
      this.quizRepository.findByCourseId(courseId).catch(() => []),
      this.assignmentRepository.findByCourseId(courseId),
      this.progressRepository.findByUserAndCourse(studentId, courseId),
      this.assignmentSubmissionRepository.findPassedAssignmentIds(studentId, courseId),
    ]);

    const completedLessonIds = new Set(
      progressRecords
        .filter((p) => p.status === 'completed')
        .map((p) => String(p.lessonId?._id || p.lessonId))
    );

    // Lessons ratio
    const activeLessons = lessons.filter((l) => !l.deletedAt);
    const totalLessons = activeLessons.length;
    const completedLessons = activeLessons.filter((l) => completedLessonIds.has(String(l._id))).length;
    const lessonRatio = totalLessons > 0 ? completedLessons / totalLessons : 0;

    // Quizzes ratio
    const activeQuizzes = (quizzes || []).filter((q) => !q.deletedAt);
    const totalQuizzes = activeQuizzes.length;
    let completedQuizzes = 0;
    if (totalQuizzes > 0) {
      for (const quiz of activeQuizzes) {
        const attempt = await this.quizAttemptRepository.findLatestCompleted(studentId, quiz._id).catch(() => null);
        if (attempt && attempt.passed) completedQuizzes++;
      }
    }
    const quizRatio = totalQuizzes > 0 ? completedQuizzes / totalQuizzes : 0;

    const activeAssignments = assignments || [];
    const passedAssignments = new Set(passedAssignmentIds);
    const totalAssignments = activeAssignments.length;
    const completedAssignments = activeAssignments.filter((assignment) => passedAssignments.has(String(assignment._id))).length;
    const assignmentRatio = totalAssignments > 0 ? completedAssignments / totalAssignments : 0;

    // Remaining activities list
    const remainingActivities = [];
    activeLessons.forEach((l) => {
      if (!completedLessonIds.has(String(l._id))) remainingActivities.push(`Lesson: ${l.title}`);
    });
    for (const quiz of activeQuizzes) {
      const attempt = await this.quizAttemptRepository.findLatestCompleted(studentId, quiz._id).catch(() => null);
      if (!attempt?.passed) remainingActivities.push(`Quiz: ${quiz.title}`);
    }
    activeAssignments.forEach((assignment) => { if (!passedAssignments.has(String(assignment._id))) remainingActivities.push(`Assignment: ${assignment.title}`); });

    // Weight normalization
    const presentTypes = [];
    if (totalLessons > 0) presentTypes.push({ type: 'LESSON', weight: DEFAULT_WEIGHTS.LESSON, ratio: lessonRatio, completed: completedLessons, total: totalLessons });
    if (totalQuizzes > 0) presentTypes.push({ type: 'QUIZ', weight: DEFAULT_WEIGHTS.QUIZ, ratio: quizRatio, completed: completedQuizzes, total: totalQuizzes });
    if (totalAssignments > 0) presentTypes.push({ type: 'ASSIGNMENT', weight: DEFAULT_WEIGHTS.ASSIGNMENT, ratio: assignmentRatio, completed: completedAssignments, total: totalAssignments });

    let overallPercentage = 0;
    const byType = {
      LESSON: { completed: completedLessons, total: totalLessons, ratio: lessonRatio },
      QUIZ: { completed: completedQuizzes, total: totalQuizzes, ratio: quizRatio },
      ASSIGNMENT: { completed: completedAssignments, total: totalAssignments, ratio: assignmentRatio },
    };

    if (presentTypes.length === 0) {
      overallPercentage = 0;
    } else {
      const sumWeights = presentTypes.reduce((acc, pt) => acc + pt.weight, 0);
      let calculatedSum = 0;
      for (const pt of presentTypes) {
        const normalized = pt.weight / sumWeights;
        calculatedSum += pt.ratio * normalized;
      }
      overallPercentage = Math.min(100, Math.round(calculatedSum * 10000) / 100);
    }

    const totalRequired = totalLessons + totalQuizzes + totalAssignments;
    const completedRequired = completedLessons + completedQuizzes + completedAssignments;
    const eligibleToComplete = totalRequired > 0 && completedRequired >= totalRequired && overallPercentage >= 99.9;

    const saved = await this.courseProgressRepository.upsertProgress(studentId, courseId, {
      percentage: overallPercentage,
      completedRequired,
      totalRequired,
      eligibleToComplete,
      byType,
      remainingActivities,
    });

    // Auto update matching student goals
    try {
      const activeGoals = await this.learningGoalRepository.findInProgressByCourse(studentId, courseId);
      for (const goal of activeGoals) {
        let currentValue = goal.currentValue;
        if (goal.goalType === 'REACH_PROGRESS_PERCENT') currentValue = Math.round(overallPercentage);
        else if (goal.goalType === 'COMPLETE_LESSONS_COUNT') currentValue = completedLessons;
        else if (goal.goalType === 'COMPLETE_COURSE') currentValue = eligibleToComplete ? 100 : Math.round(overallPercentage);
        const completed = currentValue >= goal.targetValue;
        await this.learningGoalRepository.updateProgress(goal._id, {
          currentValue,
          ...(completed ? { status: 'COMPLETED', completedAt: new Date() } : {}),
        });
      }
    } catch { /* ignore goal sync errors */ }

    return saved;
  }
}

module.exports = ProgressTrackingService;
