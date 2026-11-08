module.exports = function createController(UseCases) {
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { REVIEW_STATUSES } = require('../../domain/engagement/ReviewPolicy');
const { reviewService: ReviewService } = UseCases;
const ReviewQueryDTO = require('../../dto/review/ReviewQueryDTO');
const ReviewWriteDTO = require('../../dto/review/ReviewWriteDTO');
const { unknownFields } = require('../../dto/common/DTOUtil');

class ReviewController {
  async remove(req, res, next) {
    try {
      const data = await ReviewService.remove(req.params.reviewId, req.user);
      return ResponseUtil.success(res, { message: 'Review deleted.', data });
    } catch (error) { return next(error); }
  }
  validationError(res, errors) { return ResponseUtil.error(res, { status: 400, message: 'Validation failed.', errors }); }
  async list(req, res, next) {
    try {
      const dto = new ReviewQueryDTO(req.query);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      return ResponseUtil.success(res, { data: await ReviewService.list(dto.toObject(), req.user, req.params.courseId) });
    } catch (error) { return next(error); }
  }
  async getById(req, res, next) {
    try { return ResponseUtil.success(res, { data: { review: await ReviewService.detail(req.params.reviewId, req.user) } }); }
    catch (error) { return next(error); }
  }
  async create(req, res, next) {
    try {
      const dto = new ReviewWriteDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const review = await ReviewService.create(req.params.courseId, dto.toObject(), req.user);
      return ResponseUtil.success(res, { status: 201, message: 'Review created successfully.', data: { review } });
    } catch (error) { return next(error); }
  }
  async update(req, res, next) {
    try {
      const dto = new ReviewWriteDTO(req.body);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const review = await ReviewService.update(req.params.reviewId, dto.toObject(), req.user);
      return ResponseUtil.success(res, { message: 'Review updated successfully.', data: { review } });
    } catch (error) { return next(error); }
  }
  async moderate(req, res, next) {
    try {
      if (!REVIEW_STATUSES.includes(req.body?.status) || unknownFields(req.body || {}, ['status']).length) return this.validationError(res, { status: 'Status must be visible or hidden; only status can be changed here.' });
      const review = await ReviewService.moderate(req.params.reviewId, req.body.status, req.user);
      return ResponseUtil.success(res, { message: 'Review moderated successfully.', data: { review } });
    } catch (error) { return next(error); }
  }
  async reply(req, res, next) {
    try {
      const dto = new ReviewWriteDTO(req.body, true);
      const errors = dto.validate();
      if (Object.keys(errors).length) return this.validationError(res, errors);
      const review = await ReviewService.reply(req.params.reviewId, dto.toObject(), req.user);
      return ResponseUtil.success(res, { message: 'Reply saved successfully.', data: { review } });
    } catch (error) { return next(error); }
  }
}
return  new ReviewController();
};
