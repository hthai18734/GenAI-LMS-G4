const ServiceError = require('../../service/common/ServiceError');
const modes = ['wrong_answer'];
function field(value, label, max, optional = false) {
  if (optional && (value === undefined || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ServiceError(400, `${label}: cần nhập từ 1 đến ${max} ký tự.`);
  return value.trim();
}
function integer(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new ServiceError(400, `${label} phải từ ${min} đến ${max}.`);
  return value;
}
module.exports = {
  modes,
  parse(mode, value = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ServiceError(400, 'Thông tin học tập không hợp lệ.');
    if (mode === 'wrong_answer') {
      const details = {
        question: field(value.question, 'Đề bài', 1500),
        studentAnswer: field(value.studentAnswer, 'Câu trả lời của bạn', 1000),
        correctAnswer: field(value.correctAnswer, 'Đáp án tham khảo', 1000, true),
      };
      return { details, text: `Giải thích câu trả lời\nĐề bài: ${details.question}\nCâu trả lời của tôi: ${details.studentAnswer}\nĐáp án tham khảo do tôi cung cấp: ${details.correctAnswer || '(chưa có)'}` };
    }
    throw new ServiceError(400, 'Unsupported learning mode.');
  },
};
