const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const JWTUtil = require('../../src/utils/auth/JWTUtil');
const UserDAO = require('../../src/dao/identity/UserDAO');
const ChatService = require('../../src/service/chat/ChatService');
const routes = require('../../src/routes/chatRoutes');
const { EventEmitter } = require('node:events');

test('chat HTTP routes require authentication and whitelist the message contract', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/chat', routes);
  app.use((error, req, res, next) =>
    res.status(error.status || 500).json({ message: error.publicMessage || 'error' }),
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/chat/conversations`;
  const oldVerify = JWTUtil.verifyAccessToken;
  const oldFind = UserDAO.findById;
  const oldSend = ChatService.prototype.send;
  try {
    assert.equal((await fetch(base)).status, 401);
    JWTUtil.verifyAccessToken = () => ({ sub: '507f1f77bcf86cd799439011' });
    UserDAO.findById = async () => ({
      _id: '507f1f77bcf86cd799439011',
      role: 'student',
      status: 'active',
    });
    let captured;
    ChatService.prototype.send = async (user, id, input) => {
      captured = { user, id, input };
      return { answer: 'Done' };
    };
    const response = await fetch(`${base}/507f1f77bcf86cd799439012/messages`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello',
        requestId: 'request-123',
        role: 'admin',
        history: ['forged'],
      }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.answer, 'Done');
    assert.equal(captured.user.role, 'student');
    assert.equal(captured.input.role, undefined);
    assert.equal(captured.input.history, undefined);
    UserDAO.findById = async () => ({ role: 'student', status: 'inactive' });
    assert.equal((await fetch(base, { headers: { Authorization: 'Bearer test' } })).status, 403);
  } finally {
    JWTUtil.verifyAccessToken = oldVerify;
    UserDAO.findById = oldFind;
    ChatService.prototype.send = oldSend;
    await new Promise((resolve) => server.close(resolve));
  }
});

test('disconnect does not free a running chat job slot', () => {
  const limit = require('../../src/filter/ChatLimitFilter');
  const jobs = [];
  let admitted = 0;
  for (let i = 0; i < 5; i++) {
    const req = { method: 'POST', user: { _id: `limit-test-${i}` } };
    const res = new EventEmitter();
    res.status = () => res;
    res.json = () => res;
    limit(req, res, () => {
      admitted++;
      jobs.push(req);
    });
    res.emit('close');
  }
  assert.equal(admitted, 4);
  jobs.forEach((req) => req.releaseChatSlot());
});
