const path = require('path');
const { Worker } = require('worker_threads');
const ServiceError = require('../../service/common/ServiceError');
const types = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword', 'application/vnd.ms-word'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.txt': ['text/plain'],
  '.md': ['text/markdown', 'text/plain', 'text/x-markdown'],
};

async function parseDocument(file) {
  if (!file?.buffer?.length) throw new ServiceError(400, 'Tài liệu trống hoặc chưa được chọn.');
  const buffer = file.buffer;
  if (buffer.length > 10 * 1024 * 1024)
    throw new ServiceError(413, 'Tài liệu không được vượt quá 10 MB.');
  const name = path
    .basename(String(file.originalname).replace(/\\/g, '/'))
    .replace(/[\x00-\x1f\x7f]/g, '')
    .slice(0, 160);
  const extension = path.extname(name).toLowerCase();
  if (
    !types[extension] ||
    ![...types[extension], 'application/octet-stream'].includes(file.mimetype)
  )
    throw new ServiceError(400, 'Chỉ hỗ trợ PDF, DOC, DOCX, TXT và Markdown đúng định dạng.');
  const document = { name, size: buffer.length, mimeType: types[extension][0] };
  if (extension === '.pdf') {
    if (
      !buffer.subarray(0, 5).equals(Buffer.from('%PDF-')) ||
      !buffer.subarray(-2048).includes(Buffer.from('%%EOF')) ||
      buffer.includes(Buffer.from('/Encrypt'))
    )
      throw new ServiceError(400, 'PDF không hợp lệ hoặc được mã hóa.');
    return { ...document, data: buffer };
  }
  if (['.txt', '.md'].includes(extension)) {
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer).trim();
    } catch {
      throw new ServiceError(400, 'Tài liệu văn bản cần mã hóa UTF-8.');
    }
    if (!text || text.includes('\0'))
      throw new ServiceError(400, 'Tài liệu không chứa văn bản hợp lệ.');
    if (text.length > 80000)
      throw new ServiceError(413, 'Tài liệu vượt quá 80.000 ký tự. Hãy chia thành phần nhỏ hơn.');
    return { ...document, text };
  }
  const signature =
    extension === '.doc' ? Buffer.from('d0cf11e0a1b11ae1', 'hex') : Buffer.from('504b0304', 'hex');
  if (!buffer.subarray(0, signature.length).equals(signature))
    throw new ServiceError(400, 'File Word không đúng định dạng.');
  const text = await new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'DocumentWorker.js'), {
      workerData: { extension, buffer },
      resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 32 },
    });
    const failure = () =>
      new ServiceError(
        400,
        'Không đọc được Word: file lỗi, mã hóa, quá lớn hoặc không có văn bản.',
      );
    const timer = setTimeout(() => {
      worker.terminate();
      reject(failure());
    }, 10000);
    worker.once('message', (result) => {
      clearTimeout(timer);
      worker.terminate();
      result.error ? reject(failure()) : resolve(result.text);
    });
    worker.once('error', () => {
      clearTimeout(timer);
      reject(failure());
    });
    worker.once('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(failure());
    });
  });
  return { ...document, text };
}
module.exports = { parseDocument };
