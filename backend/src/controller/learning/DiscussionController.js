const ResponseUtil = require('../../utils/common/ResponseUtil');
const { discussionService: DiscussionService } = require('../../composition/services');

class DiscussionController {
  async listThreads(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 15;
      const result = await DiscussionService.listThreads(req.params.courseId, req.user, { page, limit });
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async createThread(req, res, next) {
    try {
      const thread = await DiscussionService.createThread(req.params.courseId, req.user, req.body);
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Discussion topic created.',
        data: { thread },
      });
    } catch (error) {
      return next(error);
    }
  }

  async getThread(req, res, next) {
    try {
      const result = await DiscussionService.getThreadDetail(req.params.postId, req.user);
      return ResponseUtil.success(res, { data: result });
    } catch (error) {
      return next(error);
    }
  }

  async createReply(req, res, next) {
    try {
      const reply = await DiscussionService.createReply(req.params.postId, req.user, req.body);
      return ResponseUtil.success(res, {
        status: 201,
        message: 'Reply posted successfully.',
        data: { reply },
      });
    } catch (error) {
      return next(error);
    }
  }

  async updatePost(req, res, next) {
    try {
      const updated = await DiscussionService.updatePost(req.params.postId, req.user, req.body);
      return ResponseUtil.success(res, {
        message: 'Message updated successfully.',
        data: { post: updated },
      });
    } catch (error) {
      return next(error);
    }
  }

  async deletePost(req, res, next) {
    try {
      await DiscussionService.deletePost(req.params.postId, req.user);
      return ResponseUtil.success(res, { message: 'Message removed successfully.' });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new DiscussionController();
