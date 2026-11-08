class DTOValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.publicMessage = message;
  }
}
module.exports = DTOValidationError;
