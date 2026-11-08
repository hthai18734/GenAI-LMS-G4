const { text, isObjectPayload, unknownFields } = require('../common/DTOUtil');
class CreateSectionDTO {
  constructor(body) { this.valid = isObjectPayload(body); this.body = this.valid ? body : {}; }
  validate() {
    const errors = {};
    if (!this.valid || unknownFields(this.body, ['name', 'title', 'description']).length) errors.payload = 'Only name and description are accepted.';
    const name = this.body.name ?? this.body.title;
    if (typeof name !== 'string' || !text(name) || text(name).length > 200) errors.name = 'Section name must be 1-200 characters.';
    if (this.body.name !== undefined && this.body.title !== undefined) errors.name = 'Provide name only.';
    if (this.body.description !== undefined && (typeof this.body.description !== 'string' || this.body.description.trim().length > 5000)) errors.description = 'Description must be text up to 5000 characters.';
    return errors;
  }
  toObject() { return { title: text(this.body.name ?? this.body.title), description: text(this.body.description) }; }
}
module.exports = CreateSectionDTO;
