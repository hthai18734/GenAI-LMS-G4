const { text, hasOwn, unknownFields } = require('../common/DTOUtil');

function validVideoRef(value) {
  if (value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  if (/^\/uploads\/lesson-videos\/[a-zA-Z0-9._-]+$/.test(value.trim())) return true;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol);
  } catch { return false; }
}

class LessonDTO {
  constructor(body = {}, { partial = false } = {}) {
    this.body = body;
    this.partial = partial;
  }

  validate() {
    const errors = {};
    const allowed = ['title', 'content', 'order', 'duration', 'videoRef', 'isPublished'];
    const unknown = unknownFields(this.body, allowed);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (this.partial && !Object.keys(this.body).length) errors.payload = 'At least one lesson field is required.';

    if (!this.partial || hasOwn(this.body, 'title')) {
      const title = text(this.body.title);
      if (!title) errors.title = 'Lesson title is required.';
      else if (title.length > 200) errors.title = 'Lesson title must not exceed 200 characters.';
    }
    if (!this.partial || hasOwn(this.body, 'content')) {
      if (!text(this.body.content)) errors.content = 'Lesson content is required.';
    }
    if (!this.partial || hasOwn(this.body, 'order')) {
      const order = Number(this.body.order);
      if (!Number.isInteger(order) || order < 1) errors.order = 'Lesson order must be an integer greater than zero.';
    }
    if (hasOwn(this.body, 'duration')) {
      const duration = Number(this.body.duration);
      if (!Number.isFinite(duration) || duration < 0) errors.duration = 'Lesson duration must be a non-negative number.';
    }
    if (hasOwn(this.body, 'videoRef') && !validVideoRef(this.body.videoRef)) {
      errors.videoRef = 'Video must be an HTTP(S) URL or an uploaded lesson video.';
    }
    if (hasOwn(this.body, 'isPublished') && typeof this.body.isPublished !== 'boolean') {
      errors.isPublished = 'Lesson publication status must be a boolean.';
    }
    return errors;
  }

  toObject() {
    const result = {};
    if (hasOwn(this.body, 'title')) result.title = text(this.body.title);
    if (hasOwn(this.body, 'content')) result.content = text(this.body.content);
    if (hasOwn(this.body, 'order')) result.order = Number(this.body.order);
    if (hasOwn(this.body, 'duration')) result.duration = Number(this.body.duration);
    if (hasOwn(this.body, 'videoRef')) result.videoRef = text(this.body.videoRef) || null;
    if (hasOwn(this.body, 'isPublished')) result.isPublished = this.body.isPublished;
    return result;
  }
}

module.exports = LessonDTO;
