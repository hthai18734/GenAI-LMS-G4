const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');

const MIN_ACTIVE_MINUTES_PER_DAY = 10;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function localDateKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftDateKey(key, amount) {
  const [year, month, day] = key.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount));
  return shifted.toISOString().slice(0, 10);
}

function dateKeysBetween(fromKey, toKey) {
  const keys = [];
  for (let key = fromKey; key <= toKey; key = shiftDateKey(key, 1)) keys.push(key);
  return keys;
}

function zonedDayBoundary(key, timeZone, endOfDay = false) {
  const [year, month, day] = key.split('-').map(Number);
  const target = Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  let instant = target;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second), endOfDay ? 999 : 0);
    instant += target - represented;
  }
  return new Date(instant);
}

function inputDateKey(value, parsed, timeZone) {
  if (typeof value === 'string' && DATE_KEY_PATTERN.test(value)) return value;
  return localDateKey(parsed, timeZone);
}

function isValidDateKey(key) {
  if (!DATE_KEY_PATTERN.test(key)) return false;
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === key;
}

class LearningStatisticsService {
  constructor({ learningActivityLogRepository, enrollmentRepository, courseProgressRepository, progressRepository, lessonRepository } = {}) {
    this.learningActivityLogRepository = learningActivityLogRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.courseProgressRepository = courseProgressRepository;
    this.progressRepository = progressRepository;
    this.lessonRepository = lessonRepository;
    this.now = () => new Date();
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

    // Calendar ranges are inclusive and use the requested timezone. Subtracting
    // seven 24-hour periods and then including both endpoints produces 8 days.
    const days = range === 'month' ? 30 : 7;
    let toDate = to ? new Date(to) : this.now();
    let fromDate = from ? new Date(from) : null;

    if ((fromDate && Number.isNaN(fromDate.getTime())) || Number.isNaN(toDate.getTime())) {
      throw new ServiceError(422, 'Invalid date range provided.');
    }
    let toKey;
    let fromKey;
    try {
      toKey = inputDateKey(to, toDate, tz);
      fromKey = from ? inputDateKey(from, fromDate, tz) : shiftDateKey(toKey, -(days - 1));
      if (!isValidDateKey(fromKey) || !isValidDateKey(toKey)) {
        throw new ServiceError(422, 'Invalid date range provided.');
      }
      if (!to) toDate = zonedDayBoundary(toKey, tz, true);
      if (!from) fromDate = zonedDayBoundary(fromKey, tz, false);
      else if (typeof from === 'string' && DATE_KEY_PATTERN.test(from)) fromDate = zonedDayBoundary(fromKey, tz, false);
      if (typeof to === 'string' && DATE_KEY_PATTERN.test(to)) toDate = zonedDayBoundary(toKey, tz, true);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(422, 'Invalid timezone provided.');
    }
    if (fromDate > toDate) {
      throw new ServiceError(422, 'fromDate cannot be after toDate.');
    }
    const requestedDateKeys = dateKeysBetween(fromKey, toKey);

    // 1. Fetch activity logs in current period
    const rawLogs = await this.learningActivityLogRepository.findStudentIntervals(studentId, {
      from: fromDate,
      to: toDate,
      courseId,
    });

    // Progress predates activity logging in older installations. Treat a
    // completedAt value as a zero-duration completion event when no matching
    // lesson activity exists, so historical completion activity is visible
    // without inventing study time or double-counting newer records.
    const completedProgress = await this.progressRepository.findCompletedInRange(studentId, {
      from: fromDate,
      to: toDate,
      courseId,
    });
    const progressCompletionEvents = completedProgress.map((record) => ({
        studentId,
        courseId: record.courseId,
        lessonId: record.lessonId,
        activityType: 'LESSON_ACTIVE',
        startedAt: record.completedAt,
        endedAt: record.completedAt,
        activeSeconds: 0,
        date: localDateKey(record.completedAt, tz),
      }));
    const lessonCompletionEvents = new Map();
    const addLessonCompletion = (event, fallbackIndex) => {
      const lessonId = event.lessonId?._id || event.lessonId;
      const fallback = event._id || event.eventKey
        || `${event.startedAt?.toISOString?.() || event.startedAt}:${event.endedAt?.toISOString?.() || event.endedAt}:${fallbackIndex}`;
      const key = lessonId ? `lesson:${lessonId}` : `event:${fallback}`;
      if (!lessonCompletionEvents.has(key)) lessonCompletionEvents.set(key, event);
    };
    rawLogs.filter((log) => log.activityType === 'LESSON_ACTIVE')
      .forEach((event, index) => addLessonCompletion(event, `log-${index}`));
    progressCompletionEvents.forEach((event, index) => addLessonCompletion(event, `progress-${index}`));
    const dedupedLessonCompletionEvents = [...lessonCompletionEvents.values()];
    const activityEvents = [
      ...rawLogs.filter((log) => log.activityType !== 'LESSON_ACTIVE'),
      ...dedupedLessonCompletionEvents,
    ];

    const validStudySeconds = this.calculateValidStudySeconds(rawLogs, fromDate, toDate);
    const validStudyMinutes = Math.round(validStudySeconds / 60);

    // 2. Daily aggregation
    const dayMap = {};
    // Pre-populate the exact requested local-calendar days.
    for (const key of requestedDateKeys) {
      dayMap[key] = { date: key, activeSeconds: 0, completedActivities: 0 };
    }

    activityEvents.forEach((log) => {
      const key = log.startedAt ? localDateKey(new Date(log.startedAt), tz) : log.date;
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
    const isActiveDay = (day) => day.activeMinutes >= MIN_ACTIVE_MINUTES_PER_DAY || day.completedActivities > 0;
    let currentStreakDays = 0;
    const sortedDaysDesc = [...daily].reverse();
    for (const d of sortedDaysDesc) {
      if (isActiveDay(d)) {
        currentStreakDays += 1;
      } else {
        break;
      }
    }
    let longestStreak = 0;
    let runningStreak = 0;
    for (const d of daily) {
      if (isActiveDay(d)) {
        runningStreak += 1;
        longestStreak = Math.max(longestStreak, runningStreak);
      } else {
        runningStreak = 0;
      }
    }

    // 4. Lessons completed count in range
    const lessonsCompleted = dedupedLessonCompletionEvents.length;

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
    const periodDurationMs = toDate.getTime() - fromDate.getTime() + 1;
    const prevToDate = new Date(fromDate.getTime() - 1);
    const prevFromDate = new Date(prevToDate.getTime() - periodDurationMs + 1);

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

    const activeDays = daily.filter(isActiveDay).length;
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
        longestStreak,
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
