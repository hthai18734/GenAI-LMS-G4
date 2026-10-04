/**
Author: ThienDDN - CE182101
Created at: 02/10/2026
Description: Notification Inbox Routes for all authenticated users
 */
const express = require('express');
const NoCacheFilter = require('../filter/NoCacheFilter');
const { AuthFilter } = require('../filter/AuthFilter');
const NotificationController = require('../controller/engagement/NotificationController');

const router = express.Router();
router.use(NoCacheFilter);
router.use(AuthFilter);

router.get('/', NotificationController.getNotifications.bind(NotificationController));
router.get('/unread-count', NotificationController.getUnreadCount.bind(NotificationController));
router.put('/read-all', NotificationController.markAllAsRead.bind(NotificationController));
router.put('/:notificationId/read', NotificationController.markAsRead.bind(NotificationController));

module.exports = router;
