const ResponseUtil = require('../../utils/common/ResponseUtil');
module.exports = ({ gradebookService }) => ({
  async view(req, res, next) {
    try {
      const page = Number(req.query.page || 1), limit = Number(req.query.limit || 20);
      if (!Number.isInteger(page) || page < 1 || page > 1000000 || !Number.isInteger(limit) || limit < 1 || limit > 100) return ResponseUtil.error(res, { status: 400, message: 'Invalid pagination.' });
      return ResponseUtil.success(res, { data: await gradebookService.view(req.params.courseId, req.user, { page, limit }) });
    } catch (e) { return next(e); }
  },
  async configure(req, res, next) {
    try {
      await gradebookService.configure(req.params.courseId, req.user);
    } catch (e) { return next(e); }
  },
  async report(req, res, next) {
    try { return ResponseUtil.success(res, { data: await gradebookService.report(req.params.courseId, req.user) }); }
    catch (e) { return next(e); }
  },
});
