const Assignment = require('../../../../../model/learning/Assignment');
const Submission = require('../../../../../model/learning/AssignmentSubmission');
module.exports = {
  async isUsed(storageKey) {
    const [prompt, submission] = await Promise.all([
      Assignment.exists({ 'attachment.storageKey': storageKey }), Submission.exists({ 'attachment.storageKey': storageKey }),
    ]);
    return Boolean(prompt || submission);
  },
};
