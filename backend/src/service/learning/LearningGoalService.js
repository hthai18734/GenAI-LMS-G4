const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const { GOAL_TYPES } = require('../../domain/learning/LearningGoalPolicy');
const ServiceError = require('../common/ServiceError');

class LearningGoalService {
  constructor({ learningGoalRepository, courseRepository, enrollmentRepository, progressRepository, lessonRepository } = {}) {
    this.learningGoalRepository = learningGoalRepository;
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.progressRepository = progressRepository;
    this.lessonRepository = lessonRepository;
  }
  assertValidId(id, field = 'ID') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} is invalid.`);
  }

  async readCurrentValue(studentId, courseId, goalType) {
    const totalLessons = await this.lessonRepository.countByCourseId(courseId);
    const completedCount = await this.progressRepository.countByUserAndCourse(studentId, courseId);
    const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    switch (goalType) {
      case 'COMPLETE_COURSE':
      case 'REACH_PROGRESS_PERCENT':
        return percent;
      case 'COMPLETE_LESSONS_COUNT':
        return completedCount;
      default:
        return percent;
    }
  }

  validateGoalRule(goalType, targetValue, deadline) {
    if (!GOAL_TYPES.includes(goalType)) {
      throw new ServiceError(422, `Invalid goalType. Supported types: ${GOAL_TYPES.join(', ')}.`);
    }

    const target = Number(targetValue);
    if (!Number.isFinite(target) || target <= 0) {
      throw new ServiceError(422, 'Target value must be a positive number.');
    }

    if (['COMPLETE_COURSE', 'REACH_PROGRESS_PERCENT'].includes(goalType)) {
      if (target > 100) throw new ServiceError(422, 'Percentage target cannot exceed 100%.');
    }

    if (!deadline) throw new ServiceError(422, 'Deadline is required.');
    const dDate = new Date(deadline);
    if (Number.isNaN(dDate.getTime())) throw new ServiceError(422, 'Invalid deadline date format.');

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (dDate < startOfToday) {
      throw new ServiceError(422, 'Deadline must be today or a future date.');
    }

    return { target, deadlineDate: dDate };
  }

  async createGoal(studentId, payload) {
    this.assertValidId(studentId, 'Student ID');
    const { courseId, goalType, targetValue, deadline } = payload;
    this.assertValidId(courseId, 'Course ID');

    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(studentId, courseId);
    if (!enrollment) {
      throw new ServiceError(403, 'You must be enrolled in this course to set a learning goal.');
    }

    const effectiveTarget = goalType === 'COMPLETE_COURSE' ? 100 : targetValue;
    const { target, deadlineDate } = this.validateGoalRule(goalType, effectiveTarget, deadline);

    const currentValue = await this.readCurrentValue(studentId, courseId, goalType);
    const isReached = currentValue >= target;

    const goal = await this.learningGoalRepository.create({
      studentId,
      courseId,
      goalType,
      targetValue: target,
      currentValue,
      deadline: deadlineDate,
      status: isReached ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: isReached ? new Date() : null,
    });

    const populated = await this.learningGoalRepository.findById(goal._id);
    return this.toDTO(populated);
  }

  async listGoals(studentId, { status, courseId, page = 1, limit = 20 } = {}) {
    this.assertValidId(studentId, 'Student ID');
    const result = await this.learningGoalRepository.findByStudent(studentId, { status, courseId, page, limit });

    // Refresh current values dynamically
    const goals = await Promise.all(result.items.map(async (g) => {
      if (g.status === 'IN_PROGRESS') {
        const freshValue = await this.readCurrentValue(studentId, g.courseId?._id || g.courseId, g.goalType);
        if (freshValue !== g.currentValue) {
          const completed = freshValue >= g.targetValue;
          await this.learningGoalRepository.updateProgress(g._id, {
            currentValue: freshValue,
            ...(completed ? { status: 'COMPLETED', completedAt: new Date() } : {}),
          });
          g.currentValue = freshValue;
          if (completed) { g.status = 'COMPLETED'; g.completedAt = new Date(); }
        }
      }
      return this.toDTO(g);
    }));

    return {
      goals,
      pagination: {
        page: Math.max(1, page),
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    };
  }

  async updateGoal(studentId, goalId, payload) {
    this.assertValidId(studentId, 'Student ID');
    this.assertValidId(goalId, 'Goal ID');

    const goal = await this.learningGoalRepository.findOwned(studentId, goalId);
    if (!goal) throw new ServiceError(404, 'Learning goal not found.');

    if (goal.status !== 'IN_PROGRESS') {
      throw new ServiceError(409, `Cannot edit a learning goal that is already ${goal.status}.`);
    }

    const target = goal.goalType === 'COMPLETE_COURSE'
      ? 100
      : (payload.targetValue !== undefined ? Number(payload.targetValue) : goal.targetValue);
    const deadline = payload.deadline || goal.deadline;
    const { target: validatedTarget, deadlineDate } = this.validateGoalRule(goal.goalType, target, deadline);

    const freshValue = await this.readCurrentValue(studentId, goal.courseId._id || goal.courseId, goal.goalType);
    const isReached = freshValue >= validatedTarget;

    const updated = await this.learningGoalRepository.updateRule(goalId, {
      targetValue: validatedTarget,
      deadline: deadlineDate,
      currentValue: freshValue,
      status: isReached ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: isReached ? new Date() : null,
    });

    return this.toDTO(updated);
  }

  async deleteGoal(studentId, goalId) {
    this.assertValidId(studentId, 'Student ID');
    this.assertValidId(goalId, 'Goal ID');

    const goal = await this.learningGoalRepository.findOwned(studentId, goalId);
    if (!goal) throw new ServiceError(404, 'Learning goal not found.');

    if (goal.status === 'COMPLETED' || goal.status === 'CANCELLED') {
      await this.learningGoalRepository.deleteById(goalId);
    } else {
      await this.learningGoalRepository.markCancelled(goalId);
    }
    return true;
  }

  toDTO(goal) {
    const g = typeof goal.toObject === 'function' ? goal.toObject() : goal;
    return {
      id: String(g._id),
      courseId: g.courseId?._id ? String(g.courseId._id) : String(g.courseId),
      courseTitle: g.courseId?.title || 'Course',
      goalType: g.goalType,
      targetValue: g.targetValue,
      currentValue: g.currentValue || 0,
      deadline: g.deadline,
      status: g.status,
      completedAt: g.completedAt,
      cancelledAt: g.cancelledAt,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }
}

module.exports = LearningGoalService;
