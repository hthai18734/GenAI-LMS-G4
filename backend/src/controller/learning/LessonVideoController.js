module.exports = function createController(UseCases) {
const { lessonVideoService } = UseCases;

return  {
  async prepareUpload(req, res, next) {
    try { await lessonVideoService.authorizeUpload(req.query.courseId, req.user); return next(); }
    catch (error) { return next(error); }
  },
  async discard(req, res, next) {
    try {
      if (!/^[a-zA-Z0-9._-]+$/.test(req.params.filename)) { const error = new Error('Invalid filename.'); error.status = 400; throw error; }
      await lessonVideoService.discard(req.params.filename, req.user); return res.status(200).json({ success: true, message: 'Unused upload discarded.', data: null });
    } catch (error) { return next(error); }
  },
  async stream(req, res, next) {
    try {
      return res.sendFile(await lessonVideoService.authorize(req.params.filename, req.user));
    } catch (error) {
      return next(error);
    }
  },
};
};
