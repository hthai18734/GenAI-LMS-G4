const ChatService = require('../../service/chat/ChatService');
const ChatDTO = require('../../dto/chat/ChatDTO');
const ResponseUtil = require('../../utils/common/ResponseUtil');
const service = new ChatService();
const action = (handler) => async (req, res, next) => {
  try {
    return ResponseUtil.success(res, { data: await handler(req) });
  } catch (error) {
    return next(error);
  } finally {
    req.releaseChatSlot?.();
  }
};
module.exports = {
  list: action((req) => service.list(req.user, ChatDTO.list(req.query))),
  create: action((req) => service.create(req.user, ChatDTO.create(req.body))),
  get: action((req) => service.get(req.user, ChatDTO.id(req.params.id))),
  send: action((req) =>
    service.send(req.user, ChatDTO.id(req.params.id), ChatDTO.message(req.body)),
  ),
  upload: action((req) => service.upload(req.user, ChatDTO.id(req.params.id), req.file)),
  remove: action((req) => service.remove(req.user, ChatDTO.id(req.params.id))),
  removeDocument: action((req) =>
    service.removeDocument(req.user, ChatDTO.id(req.params.id), ChatDTO.id(req.params.documentId)),
  ),
  async authorizeUpload(req, res, next) {
    try {
      await service.owned(req.user, ChatDTO.id(req.params.id));
      next();
    } catch (error) {
      next(error);
    }
  },
};
