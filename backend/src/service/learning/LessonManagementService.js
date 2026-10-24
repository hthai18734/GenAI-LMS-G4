const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');

class LessonManagementService {
  constructor({ lessonRepository, courseRepository, enrollmentRepository, progressRepository, materialRepository } = {}) {
    this.lessonRepository = lessonRepository;
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.progressRepository = progressRepository;
    this.materialRepository = materialRepository;
  }
  assertValidId(id, field = 'ID') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} is invalid.`);
  }

  async getOwnedActiveCourse(courseId, user) {
    this.assertValidId(courseId, 'Course ID');
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');
    if (String(course.teacherId) !== String(user._id) && String(course.instructorId) !== String(user._id)) {
      throw new ServiceError(403, 'You do not have permission to manage this course.');
    }
    return course;
  }

  async createLesson(courseId, user, payload) {
    const course = await this.getOwnedActiveCourse(courseId, user);
    const title = (payload.title || '').trim();
    if (!title) throw new ServiceError(422, 'Lesson title is required.');
    if (title.length > 200) throw new ServiceError(422, 'Lesson title must not exceed 200 characters.');

    const nextOrder = (await this.lessonRepository.maxActiveOrder(course._id)) + 1;
    const lesson = await this.lessonRepository.create({
      courseId: course._id,
      title,
      content: (payload.content || '').trim(),
      videoRef: payload.videoRef ? String(payload.videoRef).trim() : null,
      isPublished: payload.isPublished !== undefined ? Boolean(payload.isPublished) : false,
      order: payload.order && Number.isInteger(Number(payload.order)) ? Number(payload.order) : nextOrder,
      duration: payload.duration && Number(payload.duration) >= 0 ? Number(payload.duration) : 0,
    });

    return lesson;
  }

  async getLessonDetail(courseId, lessonId, user) {
    this.assertValidId(courseId, 'Course ID');
    this.assertValidId(lessonId, 'Lesson ID');

    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');

    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || String(lesson.courseId) !== String(courseId) || lesson.deletedAt) {
      throw new ServiceError(404, 'Lesson not found.');
    }

    const isTeacherOwner = user && (user.role === 'admin' || String(course.teacherId) === String(user._id) || String(course.instructorId) === String(user._id));

    if (!isTeacherOwner) {
      // Must be enrolled student and lesson published
      if (!lesson.isPublished) {
        throw new ServiceError(404, 'Lesson is not published or unavailable.');
      }
      const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, courseId);
      if (!enrollment) {
        throw new ServiceError(403, 'You must be enrolled in this course to view this lesson.');
      }

      // Record access / last visited lesson
      await this.progressRepository.upsertProgress(user._id, courseId, lessonId, 'in_progress');
    }

    // Load materials
    const rawMaterials = await this.materialRepository.findActiveByLessonId(lessonId);
    const materials = rawMaterials.map((m) => ({
      id: String(m._id),
      name: m.name,
      description: m.description,
      mimeType: m.mimeType,
      sizeBytes: m.sizeBytes,
      createdAt: m.createdAt,
    }));

    // Navigation previous / next
    const allLessons = await (isTeacherOwner
      ? this.lessonRepository.findByCourseId(courseId)
      : this.lessonRepository.findPublishedByCourseId(courseId));

    const currentIndex = allLessons.findIndex((l) => String(l._id) === String(lessonId));
    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

    // Completion status for student
    let isCompleted = false;
    if (user && user.role === 'student') {
      const prog = await this.progressRepository.findByUserAndCourse(user._id, courseId);
      const match = prog.find((p) => String(p.lessonId?._id || p.lessonId) === String(lessonId));
      isCompleted = match?.status === 'completed';
    }

    return {
      lesson: {
        id: String(lesson._id),
        courseId: String(lesson.courseId),
        title: lesson.title,
        content: lesson.content,
        videoRef: lesson.videoRef,
        isPublished: lesson.isPublished,
        order: lesson.order,
        duration: lesson.duration,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
      },
      materials,
      navigation: {
        prevLessonId: prevLesson ? String(prevLesson._id) : null,
        prevLessonTitle: prevLesson ? prevLesson.title : null,
        nextLessonId: nextLesson ? String(nextLesson._id) : null,
        nextLessonTitle: nextLesson ? nextLesson.title : null,
      },
      isCompleted,
    };
  }

  async updateLesson(lessonId, user, payload) {
    this.assertValidId(lessonId, 'Lesson ID');
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || lesson.deletedAt) throw new ServiceError(404, 'Lesson not found.');

    await this.getOwnedActiveCourse(lesson.courseId, user);

    const updates = {};
    if (payload.title !== undefined) {
      const title = String(payload.title).trim();
      if (!title) throw new ServiceError(422, 'Lesson title cannot be empty.');
      if (title.length > 200) throw new ServiceError(422, 'Lesson title must not exceed 200 characters.');
      updates.title = title;
    }
    if (payload.content !== undefined) updates.content = String(payload.content).trim();
    if (payload.videoRef !== undefined) updates.videoRef = payload.videoRef ? String(payload.videoRef).trim() : null;
    if (payload.isPublished !== undefined) updates.isPublished = Boolean(payload.isPublished);
    if (payload.duration !== undefined) {
      const dur = Number(payload.duration);
      if (Number.isFinite(dur) && dur >= 0) updates.duration = dur;
    }

    const updated = await this.lessonRepository.update(lessonId, updates);
    return updated;
  }

  async deleteLesson(lessonId, user) {
    this.assertValidId(lessonId, 'Lesson ID');
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || lesson.deletedAt) throw new ServiceError(404, 'Lesson not found.');

    await this.getOwnedActiveCourse(lesson.courseId, user);

    await this.materialRepository.softDeleteByLessonId(lessonId);
    await this.lessonRepository.softDelete(lessonId);
    await this.lessonRepository.normalizeOrder(lesson.courseId);
    return true;
  }

  async reorderLessons(courseId, user, orderedLessonIds) {
    const course = await this.getOwnedActiveCourse(courseId, user);
    if (!Array.isArray(orderedLessonIds) || orderedLessonIds.length < 2) {
      throw new ServiceError(422, 'orderedLessonIds must be an array with at least 2 lesson IDs.');
    }

    const currentLessons = await this.lessonRepository.findByCourseId(course._id);
    const currentIdSet = new Set(currentLessons.map((l) => String(l._id)));

    // Ensure sets match identically
    if (orderedLessonIds.length !== currentIdSet.size) {
      throw new ServiceError(409, 'The submitted lesson list does not match active lessons.');
    }

    for (const id of orderedLessonIds) {
      if (!currentIdSet.has(String(id))) {
        throw new ServiceError(409, `Lesson ID ${id} does not belong to this course.`);
      }
    }

    const reordered = await this.lessonRepository.reorderLessons(course._id, orderedLessonIds);
    return reordered;
  }

  // ─── I2-02: Record Lesson Access ──────────────────────────────────
  async recordAccess(lessonId, user) {
    this.assertValidId(lessonId, 'Lesson ID');
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || lesson.deletedAt) throw new ServiceError(404, 'Lesson not found.');

    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, lesson.courseId);
    if (!enrollment) {
      throw new ServiceError(403, 'You must be enrolled in this course to access this lesson.');
    }

    await this.progressRepository.upsertProgress(user._id, lesson.courseId, lessonId, 'in_progress');
    return {
      recorded: true,
      lessonId: String(lessonId),
      accessedAt: new Date(),
    };
  }
}

module.exports = LessonManagementService;
