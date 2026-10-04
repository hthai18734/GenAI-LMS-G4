const { text, unknownFields } = require('../common/DTOUtil');
class CreateCategoryDTO {
  constructor(body = {}) { this.body = body; this.name = text(body.name); this.description = text(body.description); }
  validate() {
    const errors = {};
    const unknown = unknownFields(this.body, ['name', 'description']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!this.name) errors.name = 'Category name is required.';
    else if (this.name.length > 100) errors.name = 'Category name must not exceed 100 characters.';
    if (this.description.length > 1000) errors.description = 'Description must not exceed 1000 characters.';
    return errors;
  }
  toObject() { return { name: this.name, description: this.description }; }
}
module.exports = CreateCategoryDTO;
