const ResponseUtil = require('../../utils/common/ResponseUtil');
const { wishlistService: WishlistService } = require('../../composition/services');

class WishlistController {
  async add(req, res, next) {
    try {
      const result = await WishlistService.addToWishlist(req.user._id, req.params.courseId);
      return ResponseUtil.success(res, {
        status: 200,
        message: 'Course added to wishlist.',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 12;
      const result = await WishlistService.getWishlist(req.user._id, { page, limit });
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await WishlistService.removeFromWishlist(req.user._id, req.params.courseId);
      return ResponseUtil.success(res, {
        message: 'Course removed from wishlist.',
        data: { saved: false, courseId: req.params.courseId },
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new WishlistController();
