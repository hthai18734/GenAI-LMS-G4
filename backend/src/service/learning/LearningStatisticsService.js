const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');

const MIN_ACTIVE_MINUTES_PER_DAY = 10;

class LearningStatisticsService {
  constructor({ learningActivityLogRepository, enrollmentRepository, courseProgressRepository, progressRepository, lessonRepository } = {}) {
    this.learningActivityLogRepository = learningActivityLogRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.courseProgressRepository = courseProgressRepository;
    this.progressRepository = progressRepository;
    this.lessonRepository = lessonRepository;
  }
  assertValidId(id, field = 'ID') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} is invalid.`);
  }

  // Union interval merge algorithm for de-duplicating overlapping study intervals
  mergeTimeIntervals(intervals) {
    if (!intervals || !intervals.length) return [];
    const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged = [];

    for (const cur of sorted) {
      if (!merged.length) {
        merged.push({ start: cur.start, end: cur.end });
        continue;
      }
      const last = merged[merged.length - 1];
      if (cur.start <= last.end) {
        last.end = new Date(Math.max(last.end.getTime(), cur.end.getTime()));
      } else {
        merged.push({ start: cur.start, end: cur.end });
      }
    }

    return merged;
  }

  calculateValidStudySeconds(intervals, fromDate, toDate) {
    if (!intervals || !intervals.length) return 0;
    // Clip intervals to [fromDate, toDate]
    const clipped = intervals
      .map((item) => {
        const start = new Date(Math.max(item.startedAt.getTime(), fromDate.getTime()));
        const end = new Date(Math.min(item.endedAt.getTime(), toDate.getTime()));
        return { start, end };
      })
      .filter((item) => item.end > item.start);

    const merged = this.mergeTimeIntervals(clipped);
    return Math.round(merged.reduce((acc, seg) => acc + (seg.end.getTime() - seg.start.getTime()) / 1000, 0));
  }

  async getLearningStatistics(studentId, options = {}) {
    this.assertValidId(studentId, 'Student ID');
    let { from, to, tz = 'Asia/Ho_Chi_Minh', courseId = null, range = 'week' } = options;

    if (courseId) this.assertValidId(courseId, 'Course ID');

    // Default based on range (week = 7 days, month = 30 days)
    const days = range === 'month' ? 30 : 7;
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new ServiceError(422, 'Invalid date range provided.');
    }
    if (fromDate > toDate) {
      throw new ServiceError(422, 'fromDate cannot be after toDate.');
    }

    // 1. Fetch activity logs in current period
    const rawLogs = await this.learningActivityLogRepository.findStudentIntervals(studentId, {
      from: fromDate,
      to: toDate,
      courseId,
    });

    const validStudySeconds = this.calculateValidStudySeconds(rawLogs, fromDate, toDate);
    const validStudyMinutes = Math.round(validStudySeconds / 60);

    // 2. Daily aggregation
    const dayMap = {};
    // Pre-populate days in range
    const cursor = new Date(fromDate);
    cursor.setHours(0, 0, 0, 0);
    const endCursor = new Date(toDate);
    endCursor.setHours(23, 59, 59, 999);

    while (cursor <= endCursor) {
      const key = cursor.toISOString().split('T')[0];
      dayMap[key] = { date: key, activeSeconds: 0, completedActivities: 0 };
      cursor.setDate(cursor.getDate() + 1);
    }

    rawLogs.forEach((log) => {
      const key = log.date || (log.startedAt ? log.startedAt.toISOString().split('T')[0] : null);
      if (key && dayMap[key]) {
        dayMap[key].activeSeconds += log.activeSeconds || 0;
        if (['LESSON_ACTIVE', 'QUIZ_SUBMIT', 'COURSE_COMPLETE'].includes(log.activityType)) {
          dayMap[key].completedActivities += 1;
        }
      }
    });

    const daily = Object.values(dayMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date,
        activeMinutes: Math.round(d.activeSeconds / 60),
        completedActivities: d.completedActivities,
      }));

    // 3. Learning streak algorithm
    let currentStreakDays = 0;
    const sortedDaysDesc = [...daily].reverse();
    for (const d of sortedDaysDesc) {
      if (d.activeMinutes >= MIN_ACTIVE_MINUTES_PER_DAY) {
        currentStreakDays += 1;
      } else {
        break;
      }
    }

    // 4. Lessons completed count in range
    const lessonsCompleted = await this.learningActivityLogRepository.countActivities(studentId, {
      from: fromDate,
      to: toDate,
      courseId,
      activityType: 'LESSON_ACTIVE',
    });

    // 5. Completion rate (average progress across student's enrolled courses)
    const enrollments = await this.enrollmentRepository.findByUserId(studentId);
    let totalProgress = 0;
    let enrolledCount = 0;
    for (const enr of enrollments) {
      const cid = enr.courseId?._id || enr.courseId;
      if (cid) {
        enrolledCount++;
        const prog = await this.courseProgressRepository.findByStudentAndCourse(studentId, cid);
        totalProgress += prog ? prog.percentage : (enr.status === 'completed' ? 100 : 0);
      }
    }
    const completionRate = enrolledCount > 0 ? Math.round((totalProgress / enrolledCount) * 10) / 10 : 0;

    // 6. Period comparison (equal-length preceding range)
    const periodDurationMs = toDate.getTime() - fromDate.getTime();
    const prevToDate = new Date(fromDate.getTime());
    const prevFromDate = new Date(fromDate.getTime() - periodDurationMs);

    const prevLogs = await this.learningActivityLogRepository.findStudentIntervals(studentId, {
      from: prevFromDate,
      to: prevToDate,
      courseId,
    });
    const prevValidSeconds = this.calculateValidStudySeconds(prevLogs, prevFromDate, prevToDate);
    const prevValidMinutes = Math.round(prevValidSeconds / 60);

    let studyMinutesDeltaPercent = null;
    if (prevValidMinutes > 0) {
      studyMinutesDeltaPercent = Math.round(((validStudyMinutes - prevValidMinutes) / prevValidMinutes) * 1000) / 10;
    } else if (validStudyMinutes > 0) {
      studyMinutesDeltaPercent = 100.0;
    } else {
      studyMinutesDeltaPercent = 0.0;
    }

    const activeDays = daily.filter((d) => d.activeMinutes >= MIN_ACTIVE_MINUTES_PER_DAY).length;
    const totalHours = Math.round((validStudyMinutes / 60) * 10) / 10;

    return {
      summary: {
        validStudyMinutes,
        validStudySeconds,
        totalHours,
        totalMinutes: validStudyMinutes,
        activeDays,
        completionRate,
        currentStreakDays,
        currentStreak: currentStreakDays,
        lessonsCompleted,
        periodDeltaPercent: studyMinutesDeltaPercent,
      },
      comparison: {
        studyMinutesDeltaPercent,
        prevPeriodMinutes: prevValidMinutes,
        absoluteDeltaMinutes: validStudyMinutes - prevValidMinutes,
      },
      daily,
    };
  }
}

module.exports = LearningStatisticsService;
