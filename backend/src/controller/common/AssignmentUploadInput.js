module.exports = function assignmentUploadInput(req) {
  if (!req.is?.('multipart/form-data')) return req.body;
  try {
    if (Object.keys(req.body || {}).some(key => key !== 'data')) throw new Error();
    const data = JSON.parse(req.body.data || '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw Object.assign(new Error('Invalid assignment form data.'), { status: 400 }); }
};
