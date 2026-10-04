const { text, hasOwn, unknownFields } = require('../common/DTOUtil');
class UpdateCategoryDTO {
  constructor(body = {}) { this.body = body; }
  validate() {
    const errors = {};
    const unknown = unknownFields(this.body, ['name', 'description']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!Object.keys(this.body).length) errors.payload = 'At least one editable field is required.';
    if (hasOwn(this.body, 'name') && (!text(this.body.name) || text(this.body.name).length > 100)) errors.name = 'Category name must be 1-100 characters.';
    if (hasOwn(this.body, 'description') && (typeof this.body.description !== 'string' || text(this.body.description).length > 1000)) errors.description = 'Description must not exceed 1000 characters.';
    return errors;
  }
  toObject() { const result = {}; if (hasOwn(this.body, 'name')) result.name = text(this.body.name); if (hasOwn(this.body, 'description')) result.description = text(this.body.description); return result; }
}
module.exports = UpdateCategoryDTO;
