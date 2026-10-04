const { text, objectId, unknownFields } = require('../common/DTOUtil');

class CreateCourseDTO {
  constructor(body = {}) {
    this.body = body;
    this.title = text(body.title);
    this.description = text(body.description);
    this.thumbnail = text(body.thumbnail);
    this.category = text(body.category);
    this.categoryId = body.categoryId || null;
    this.duration = body.duration;
  }

  validate() {
    const errors = {};
    const unknown = unknownFields(this.body, [
      'title',
      'description',
      'thumbnail',
      'category',
      'categoryId',
      'duration',
    ]);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!this.title) errors.title = 'Course title is required.';
    else if (this.title.length > 200) errors.title = 'Course title must not exceed 200 characters.';
    if (!this.description) errors.description = 'Course description is required.';
    else if (this.description.length > 5000)
      errors.description = 'Course description must not exceed 5000 characters.';
    if (this.thumbnail && this.thumbnail.length > 2048)
      errors.thumbnail = 'Thumbnail must not exceed 2048 characters.';
    if (this.category && this.category.length > 100)
      errors.category = 'Category must not exceed 100 characters.';
    if (!objectId(this.categoryId)) errors.categoryId = 'Category ID is invalid.';
    if (
      this.duration !== undefined &&
      this.duration !== null &&
      this.duration !== '' &&
      (!Number.isFinite(Number(this.duration)) || Number(this.duration) < 0)
    ) {
      errors.duration = 'Duration must be a non-negative number.';
    }
    return errors;
  }

  toObject() {
    return {
      title: this.title,
      description: this.description,
      thumbnail: this.thumbnail || null,
      category: this.category || null,
      categoryId: this.categoryId || null,
      ...(this.duration !== undefined && this.duration !== null && this.duration !== ''
        ? { duration: Number(this.duration) }
        : {}),
    };
  }
}

module.exports = CreateCourseDTO;
