const dao = require('../../dao/chat/ChatLearningDAO');
const ServiceError = require('../common/ServiceError');
const levels = { beginner: 'Mới bắt đầu', intermediate: 'Trung bình', advanced: 'Nâng cao' };
const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const short = (value, max = 600) => String(value || '').slice(0, max);
function parseJson(text) {
  try {
    const result = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Expected object');
    return result;
  }
  catch { throw new ServiceError(502, 'AI trả về dữ liệu chưa đúng định dạng. Vui lòng thử lại.'); }
}
function validText(value, max = 1200) { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }
const escapeMd = text => String(text).replace(/[\\`*_{}\[\]<>#|]/g, '\\$&');

class ChatLearningService {
  constructor(source = dao) { this.source = source; }

  async prepare(user, input) {
    if (input.mode === 'wrong_answer') return {
      instruction: 'Phân tích đề bài và câu trả lời trong dữ liệu người dùng. Trả lời theo 4 phần: Nhận xét; Sai ở đâu và vì sao; Cách giải đúng từng bước; Câu hỏi luyện tập. Không mặc định câu trả lời sai. Nếu đúng hãy xác nhận. Đáp án tham khảo là do người dùng nhập, chưa được hệ thống chấm. Nếu thiếu dữ kiện hoặc mâu thuẫn với lesson, nói rõ; không bịa điểm hay kết quả quiz.',
      data: input.details,
      finish: text => ({ answer: text, mode: input.mode }),
    };
    return null;
  }
}
module.exports = ChatLearningService;
