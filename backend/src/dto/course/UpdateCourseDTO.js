const { text, hasOwn, objectId, unknownFields } = require('../common/DTOUtil');

class UpdateCourseDTO {
  constructor(body = {}) {
    this.body = body;
  }

  validate() {
    const errors = {};
    const allowed = ['title', 'description', 'thumbnail', 'category', 'categoryId', 'duration'];
    const unknown = unknownFields(this.body, allowed);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!Object.keys(this.body).length) errors.payload = 'At least one editable field is required.';
    if (hasOwn(this.body, 'title') && (!text(this.body.title) || text(this.body.title).length > 200)) errors.title = 'Course title must be 1-200 characters.';
    if (hasOwn(this.body, 'description') && (!text(this.body.description) || text(this.body.description).length > 5000)) errors.description = 'Course description must be 1-5000 characters.';
    if (hasOwn(this.body, 'thumbnail') && typeof this.body.thumbnail !== 'string') errors.thumbnail = 'Thumbnail must be a string.';
    if (hasOwn(this.body, 'thumbnail') && text(this.body.thumbnail).length > 2048) errors.thumbnail = 'Thumbnail must not exceed 2048 characters.';
    if (hasOwn(this.body, 'category') && typeof this.body.category !== 'string') errors.category = 'Category must be a string.';
    if (hasOwn(this.body, 'category') && text(this.body.category).length > 100) errors.category = 'Category must not exceed 100 characters.';
    if (hasOwn(this.body, 'categoryId') && this.body.categoryId !== null && !objectId(this.body.categoryId)) errors.categoryId = 'Category ID is invalid.';
    if (hasOwn(this.body, 'duration') && (!Number.isFinite(Number(this.body.duration)) || Number(this.body.duration) < 0)) errors.duration = 'Duration must be a non-negative number.';
    return errors;
  }

  toObject() {
    const result = {};
    if (hasOwn(this.body, 'title')) result.title = text(this.body.title);
    if (hasOwn(this.body, 'description')) result.description = text(this.body.description);
    if (hasOwn(this.body, 'thumbnail')) result.thumbnail = text(this.body.thumbnail) || null;
    if (hasOwn(this.body, 'category')) result.category = text(this.body.category) || null;
    if (hasOwn(this.body, 'categoryId')) result.categoryId = this.body.categoryId || null;
    if (hasOwn(this.body, 'duration')) result.duration = Number(this.body.duration);
    return result;
  }
}

module.exports = UpdateCourseDTO;
