export const ASSIGNMENT_FILE_ACCEPT = '.pdf,.doc,.docx';
export function validateAssignmentFile(file) {
  if (!file) return;
  if (!/\.(pdf|doc|docx)$/i.test(file.name)) throw new Error('Choose a PDF, DOC or DOCX file.');
  if (!file.size || file.size > 25 * 1024 * 1024) throw new Error('Document must be non-empty and no larger than 25 MB.');
}
export function assignmentRequestBody(data, file) {
  if (!file) return JSON.stringify(data);
  validateAssignmentFile(file);
  const body = new FormData(); body.append('data', JSON.stringify(data)); body.append('file', file);
  return body;
}
