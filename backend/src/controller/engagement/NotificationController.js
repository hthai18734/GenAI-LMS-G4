module.exports = function createController(UseCases) {
const ResponseUtil = require('../../utils/common/ResponseUtil');
const { notificationService: NotificationService } = UseCases;
const { handleError } = require('../common/ControllerUtil');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      for (const field of ['page', 'limit']) {
        const value = req.query[field];
        if (value !== undefined && (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > (field === 'limit' ? 50 : 1000000))) return ResponseUtil.error(res, { status: 400, message: `Invalid ${field}.` });
      }
      return ResponseUtil.success(res, { data: await NotificationService.list(req.user._id, req.query) });
    } catch (error) { return handleError(res, next, error); }
  }
  async getUnreadCount(req, res, next) {
    try { return ResponseUtil.success(res, { data: await NotificationService.unreadCount(req.user._id) }); }
    catch (error) { return handleError(res, next, error); }
  }
  async markAsRead(req, res, next) {
    try { await NotificationService.markAsRead(req.params.notificationId, req.user._id); return ResponseUtil.success(res, { message: 'Notification marked as read.' }); }
    catch (error) { return handleError(res, next, error); }
  }
  async markAllAsRead(req, res, next) {
    try { return ResponseUtil.success(res, { message: 'All notifications marked as read.', data: await NotificationService.markAllAsRead(req.user._id) }); }
    catch (error) { return handleError(res, next, error); }
  }
  async remove(req, res, next) {
    try { await NotificationService.remove(req.params.notificationId, req.user._id); return ResponseUtil.success(res, { message: 'Notification deleted.' }); }
    catch (error) { return handleError(res, next, error); }
  }
}
return  new NotificationController();
};
