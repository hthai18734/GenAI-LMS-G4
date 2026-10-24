const { text, unknownFields } = require('../common/DTOUtil');

class ReviewWriteDTO {
  constructor(body = {}, replying = false) { this.body = body || {}; this.replying = replying; }
  validate() {
    const errors = {};
    const unknown = unknownFields(this.body, this.replying ? ['content'] : ['rating', 'content']);
    if (unknown.length) errors.payload = `Unsupported field(s): ${unknown.join(', ')}`;
    if (!text(this.body.content) || text(this.body.content).length > 2000) errors.content = 'Content must be 1–2000 characters.';
    if (!this.replying && (!Number.isInteger(this.body.rating) || this.body.rating < 1 || this.body.rating > 5)) errors.rating = 'Rating must be an integer from 1 to 5.';
    return errors;
  }
  toObject() {
    return this.replying ? { content: text(this.body.content) } : { content: text(this.body.content), rating: this.body.rating };
  }
}
module.exports = ReviewWriteDTO;
