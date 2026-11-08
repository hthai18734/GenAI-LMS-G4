module.exports = ({ assignmentDocumentService: documents, assignmentService, courseService }) => ({
  async preparePrompt(req, res, next) {
    if (!req.is('multipart/form-data')) return next();
    try {
      if (req.params.assignmentId) await assignmentService.getOwnedAssignment(req.params.assignmentId, req.user, { requireEditable: true });
      else courseService.assertContentEditable(await courseService.getOwnedCourse(req.params.courseId, req.user));
      return next();
    } catch (error) { return next(error); }
  },
  async prepareSubmission(req, res, next) {
    if (!req.is('multipart/form-data')) return next();
    try { await assignmentService.assertCanSubmit(req.params.assignmentId, req.user); return next(); }
    catch (error) { return next(error); }
  },
  async prompt(req, res, next) {
    try {
      const info = await documents.downloadPrompt(req.params.assignmentId, req.user);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.download(info.filePath, info.fileName, { headers: { 'Content-Type': info.mimeType, 'Cache-Control': 'no-store' } });
    } catch (error) { return next(error); }
  },
  async submission(req, res, next) {
    try {
      const info = await documents.downloadSubmission(req.params.submissionId, req.user);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.download(info.filePath, info.fileName, { headers: { 'Content-Type': info.mimeType, 'Cache-Control': 'no-store' } });
    } catch (error) { return next(error); }
  },
});
