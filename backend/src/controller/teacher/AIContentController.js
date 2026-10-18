const ContentGenerationDTO = require('../../dto/ai/ContentGenerationDTO');
const ContentGenerationService = require('../../service/ai/ContentGenerationService');
const ResponseUtil = require('../../utils/common/ResponseUtil');

const service = new ContentGenerationService();

module.exports = {
  async generate(req, res, next) {
    try {
      const data = await service.generate(ContentGenerationDTO.parse(req.body));
      return ResponseUtil.success(res, { data });
    } catch (error) { return next(error); }
  },
};
