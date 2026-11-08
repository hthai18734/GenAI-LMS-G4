const ResponseUtil = require('../../utils/common/ResponseUtil');
const CreateSectionDTO = require('../../dto/course/CreateSectionDTO');
module.exports = ({ sectionService }) => ({
  async create(req, res, next) {
    try {
      const dto = new CreateSectionDTO(req.body); const errors = dto.validate();
      if (Object.keys(errors).length) return ResponseUtil.error(res, { status: 400, errors, message: 'Invalid section information.' });
      return ResponseUtil.success(res, { status: 201, data: { section: await sectionService.create(req.params.courseId, req.user, dto.toObject()) } });
    } catch (error) { return next(error); }
  },
  async list(req, res, next) {
    try { return ResponseUtil.success(res, { data: { sections: await sectionService.list(req.params.courseId, req.user) } }); }
    catch (error) { return next(error); }
  },
});
