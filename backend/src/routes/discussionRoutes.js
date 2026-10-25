const express = require('express');
const NoCacheFilter = require('../filter/NoCacheFilter');
const { AuthFilter } = require('../composition/http');
const DiscussionController = require('../composition/http').controllers.DiscussionController;

const router = express.Router();
router.use(NoCacheFilter, AuthFilter);
router.use(require('../filter/TeachingPermissionFilter'));

router.get('/courses/:courseId/discussions', DiscussionController.listThreads.bind(DiscussionController));
router.post('/courses/:courseId/discussions', DiscussionController.createThread.bind(DiscussionController));
router.get('/discussions/:postId', DiscussionController.getThread.bind(DiscussionController));
router.post('/discussions/:postId/replies', DiscussionController.createReply.bind(DiscussionController));
router.put('/discussions/:postId', DiscussionController.updatePost.bind(DiscussionController));
router.patch('/discussions/:postId', DiscussionController.updatePost.bind(DiscussionController));
router.delete('/discussions/:postId', DiscussionController.deletePost.bind(DiscussionController));

module.exports = router;
