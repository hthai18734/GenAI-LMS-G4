const { isValidIdentifier } = require('../../domain/common/IdentifierPolicy');
const ServiceError = require('../common/ServiceError');

class DiscussionService {
  constructor({ discussionPostRepository, courseRepository, enrollmentRepository } = {}) {
    this.discussionPostRepository = discussionPostRepository;
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
  }
  assertValidId(id, field = 'ID') {
    if (!isValidIdentifier(id)) throw new ServiceError(400, `${field} is invalid.`);
  }

  async assertUserHasCourseAccess(courseId, user) {
    this.assertValidId(courseId, 'Course ID');
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) throw new ServiceError(404, 'Course not found.');

    const isTeacher = String(course.teacherId) === String(user._id) || String(course.instructorId) === String(user._id);
    if (isTeacher) return { course, role: 'teacher' };

    const enrollment = await this.enrollmentRepository.findAccessibleEnrollment(user._id, courseId);
    if (!enrollment) {
      throw new ServiceError(403, 'You must be enrolled in this course to view or participate in discussions.');
    }
    return { course, role: 'student' };
  }

  async listThreads(courseId, user, { page = 1, limit = 15 } = {}) {
    await this.assertUserHasCourseAccess(courseId, user);
    const result = await this.discussionPostRepository.findThreadsByCourse(courseId, { page, limit });
    return {
      threads: result.items.map((t) => this.toThreadDTO(t)),
      pagination: {
        page: Math.max(1, page),
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    };
  }

  async createThread(courseId, user, payload) {
    await this.assertUserHasCourseAccess(courseId, user);
    const body = (payload.body || '').trim();
    if (!body) throw new ServiceError(422, 'Discussion body is required.');
    if (body.length > 5000) throw new ServiceError(422, 'Discussion message must not exceed 5000 characters.');

    const title = (payload.title || '').trim() || null;
    const post = await this.discussionPostRepository.create({
      courseId,
      authorId: user._id,
      parentId: null,
      title,
      body,
    });

    const populated = await this.discussionPostRepository.findById(post._id);
    return this.toThreadDTO(populated);
  }

  async getThreadDetail(postId, user) {
    this.assertValidId(postId, 'Post ID');
    const post = await this.discussionPostRepository.findById(postId);
    if (!post) throw new ServiceError(404, 'Discussion post not found.');

    await this.assertUserHasCourseAccess(post.courseId, user);
    const replies = await this.discussionPostRepository.findReplies(post._id);

    return {
      thread: this.toThreadDTO(post),
      replies: replies.map((r) => this.toReplyDTO(r)),
    };
  }

  async createReply(postId, user, payload) {
    this.assertValidId(postId, 'Post ID');
    const parentPost = await this.discussionPostRepository.findById(postId);
    if (!parentPost || parentPost.status === 'deleted') {
      throw new ServiceError(404, 'Cannot reply to a deleted or non-existent discussion thread.');
    }

    await this.assertUserHasCourseAccess(parentPost.courseId, user);

    const body = (payload.body || '').trim();
    if (!body) throw new ServiceError(422, 'Reply message cannot be empty.');
    if (body.length > 5000) throw new ServiceError(422, 'Reply message must not exceed 5000 characters.');

    // If parentPost is already a reply, link to the top-level thread to keep max 2 levels
    const targetParentId = parentPost.parentId ? parentPost.parentId : parentPost._id;

    const reply = await this.discussionPostRepository.create({
      courseId: parentPost.courseId,
      authorId: user._id,
      parentId: targetParentId,
      body,
    });

    const populated = await this.discussionPostRepository.findById(reply._id);
    return this.toReplyDTO(populated);
  }

  async updatePost(postId, user, payload) {
    this.assertValidId(postId, 'Post ID');
    const post = await this.discussionPostRepository.findById(postId);
    if (!post) throw new ServiceError(404, 'Discussion post not found.');
    if (String(post.authorId?._id || post.authorId) !== String(user._id)) {
      throw new ServiceError(403, 'You can only edit your own discussion posts.');
    }
    if (post.status === 'deleted') {
      throw new ServiceError(409, 'Cannot edit a deleted message.');
    }

    const body = (payload.body || '').trim();
    if (!body) throw new ServiceError(422, 'Message cannot be empty.');

    const updated = await this.discussionPostRepository.updateBody(postId, body);
    return this.toReplyDTO(updated);
  }

  async deletePost(postId, user) {
    this.assertValidId(postId, 'Post ID');
    const post = await this.discussionPostRepository.findById(postId);
    if (!post) throw new ServiceError(404, 'Discussion post not found.');
    if (String(post.authorId?._id || post.authorId) !== String(user._id)) {
      throw new ServiceError(403, 'You can only delete your own discussion posts.');
    }

    await this.discussionPostRepository.softDelete(postId);
    return true;
  }

  toThreadDTO(post) {
    const p = post;
    return {
      id: String(p._id),
      courseId: String(p.courseId),
      author: {
        id: String(p.authorId?._id || p.authorId),
        fullName: p.authorId?.fullName || 'User',
        avatar: p.authorId?.avatar || null,
        role: p.authorId?.role || 'student',
      },
      title: p.title,
      body: p.body,
      status: p.status,
      replyCount: p.replyCount || 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  toReplyDTO(reply) {
    const r = reply;
    return {
      id: String(r._id),
      parentId: String(r.parentId),
      author: {
        id: String(r.authorId?._id || r.authorId),
        fullName: r.authorId?.fullName || 'User',
        avatar: r.authorId?.avatar || null,
        role: r.authorId?.role || 'student',
      },
      body: r.body,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}

module.exports = DiscussionService;
