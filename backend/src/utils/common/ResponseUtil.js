class ResponseUtil {
  static success(res, { status = 200, message = 'Success', data = null } = {}) {
    return res.status(status).json({ success: true, message, data });
  }

  static error(res, { status = 400, message = 'Request failed', errors = null } = {}) {
    return res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
  }
}

module.exports = ResponseUtil;
