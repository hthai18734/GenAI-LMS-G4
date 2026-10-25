module.exports = function createController(UseCases) {
const { lessonVideoService } = UseCases;

return  {
  async stream(req, res, next) {
    try {
      return res.sendFile(await lessonVideoService.authorize(req.params.filename, req.user));
    } catch (error) {
      return next(error);
    }
  },
};
};
