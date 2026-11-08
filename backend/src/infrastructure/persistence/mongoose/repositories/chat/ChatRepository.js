const crypto = require('crypto');
const Conversation = require('../../../../../model/chat/ChatConversation');
const Document = require('../../../../../model/chat/ChatDocument');

function conflict(code) { const error = new Error(code); error.code = code; return error; }

class ChatRepository {
  create(ownerId, context, title) { return Conversation.create({ ownerId, ...context, title }); }
  list(ownerId, context = {}, before = null) {
    return Conversation.find({ ownerId, ...(context.courseId ? { courseId: context.courseId } : {}), ...(context.lessonId ? { lessonId: context.lessonId } : {}), ...(before ? { _id: { $lt: before } } : {}) })
      .select('-turns -lockToken -lockUntil').sort({ _id: -1 }).limit(31).lean();
  }
  get(ownerId, id) { return Conversation.findOne({ _id: id, ownerId }).lean(); }
  documents(ownerId, conversationId, withData = false) {
    return Document.find({ ownerId, conversationId }).select(withData ? '+data' : '-text').lean();
  }
  addDocument(ownerId, conversationId, document) { return Document.create({ ownerId, conversationId, ...document }); }
  removeDocument(ownerId, conversationId, id) { return Document.deleteOne({ _id: id, ownerId, conversationId }); }
  async lock(ownerId, id) {
    const token = crypto.randomUUID();
    const row = await Conversation.findOneAndUpdate({ _id: id, ownerId, $or: [{ lockUntil: null }, { lockUntil: { $lt: new Date() } }] }, {
      $set: { lockToken: token, lockUntil: new Date(Date.now() + 5 * 60 * 1000) },
    }, { new: true }).lean();
    if (!row) throw conflict('CHAT_LOCK_CONFLICT');
    return { row, token };
  }
  unlock(ownerId, id, token) { return Conversation.updateOne({ _id: id, ownerId, lockToken: token }, { $set: { lockToken: null, lockUntil: null } }); }
  async append(ownerId, id, token, turn, title) {
    const result = await Conversation.updateOne({ _id: id, ownerId, lockToken: token }, { $push: { turns: turn }, $set: { title } });
    if (!result.matchedCount) throw conflict('CHAT_SESSION_CHANGED');
  }
  async remove(ownerId, id, token) {
    await Document.deleteMany({ ownerId, conversationId: id });
    await Conversation.deleteOne({ _id: id, ownerId, lockToken: token });
  }
}
module.exports = new ChatRepository();
