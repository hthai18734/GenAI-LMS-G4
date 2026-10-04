const ResponseUtil = require('../utils/common/ResponseUtil');
const windows = new Map();
let active = 0;

module.exports = function ChatLimitFilter(req, res, next) {
  if (req.method === 'GET') return next();
  const now = Date.now();
  for (const [key, value] of windows) if (value.until < now) windows.delete(key);
  const key = String(req.user._id);
  const window = windows.get(key) || { count: 0, until: now + 60000 };
  if (window.count >= 15 || active >= 4 || (!windows.has(key) && windows.size >= 10000))
    return ResponseUtil.error(res, {
      status: 429,
      message: 'Chat đang bận. Vui lòng đợi một phút rồi thử lại.',
    });
  window.count++;
  windows.set(key, window);
  active++;
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      active--;
    }
  };
  req.releaseChatSlot = release;
  res.once('finish', release);
  return next();
};
