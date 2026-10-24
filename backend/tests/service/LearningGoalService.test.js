const test = require('node:test');
const assert = require('node:assert/strict');
const { learningGoalService: LearningGoalService } = require('../../src/composition/services');
const LearningGoalRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/LearningGoalRepository');
const CourseRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/CourseRepository');
const EnrollmentRepository = require('../../src/infrastructure/persistence/mongoose/repositories/learning/EnrollmentRepository');
const ServiceError = require('../../src/service/common/ServiceError');

const COURSE_ID = '507f1f77bcf86cd799439011';
const STUDENT_ID = '507f1f77bcf86cd799439012';
const GOAL_ID = '507f1f77bcf86cd799439017';

function restore(target, originals) {
  Object.assign(target, originals);
}

test('createGoal validates goalType, future deadline, and initializes status', async () => {
  const origCourseFind = CourseRepository.findById;
  const origEnrollFind = EnrollmentRepository.findAccessibleEnrollment;
  const origGoalCreate = LearningGoalRepository.create;
  const origGoalFind = LearningGoalRepository.findById;
  const origReadCurrent = LearningGoalService.readCurrentValue;

  CourseRepository.findById = async () => ({ _id: COURSE_ID, deletedAt: null });
  EnrollmentRepository.findAccessibleEnrollment = async () => ({ _id: 'enr1' });
  LearningGoalService.readCurrentValue = async () => 20;

  let createdDoc;
  LearningGoalRepository.create = async (doc) => {
    createdDoc = doc;
    return { _id: GOAL_ID, ...doc };
  };
  LearningGoalRepository.findById = async () => ({
    _id: GOAL_ID,
    courseId: { _id: COURSE_ID, title: 'JS Fundamentals' },
    ...createdDoc,
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 5);

  try {
    const goal = await LearningGoalService.createGoal(STUDENT_ID, {
      courseId: COURSE_ID,
      goalType: 'REACH_PROGRESS_PERCENT',
      targetValue: 80,
      deadline: tomorrow.toISOString(),
    });

    assert.equal(createdDoc.goalType, 'REACH_PROGRESS_PERCENT');
    assert.equal(createdDoc.targetValue, 80);
    assert.equal(createdDoc.status, 'IN_PROGRESS');

    // Reject invalid goalType
    await assert.rejects(
      LearningGoalService.createGoal(STUDENT_ID, {
        courseId: COURSE_ID,
        goalType: 'INVALID_TYPE',
        targetValue: 50,
        deadline: tomorrow.toISOString(),
      }),
      (err) => err instanceof ServiceError && err.status === 422,
    );

    // Reject past deadline
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 5);
    await assert.rejects(
      LearningGoalService.createGoal(STUDENT_ID, {
        courseId: COURSE_ID,
        goalType: 'REACH_PROGRESS_PERCENT',
        targetValue: 50,
        deadline: yesterday.toISOString(),
      }),
      (err) => err instanceof ServiceError && err.status === 422,
    );
  } finally {
    restore(CourseRepository, { findById: origCourseFind });
    restore(EnrollmentRepository, { findAccessibleEnrollment: origEnrollFind });
    restore(LearningGoalRepository, { create: origGoalCreate, findById: origGoalFind });
    LearningGoalService.readCurrentValue = origReadCurrent;
  }
});
