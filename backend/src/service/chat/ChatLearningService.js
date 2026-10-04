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
    if (!['recommend', 'study_plan'].includes(input.mode)) return null;
    const [catalog, enrollments] = await Promise.all([this.source.catalog(), this.source.enrollments(user._id)]);
    const statuses = new Map(enrollments.map(e => [String(e.courseId), e.status]));
    const words = normalize(input.details.goal).split(/\W+/).filter(w => w.length > 2);
    const candidates = catalog.filter(c => input.mode !== 'recommend' || !statuses.has(String(c._id)))
      .map(c => ({ c, score: words.reduce((sum, word) => sum + (normalize(`${c.title} ${c.category} ${c.description}`).includes(word) ? 1 : 0), 0) }))
      .sort((a, b) => b.score - a.score).slice(0, 20).map(({ c }) => ({
        id: String(c._id), title: short(c.title, 200), description: short(c.description), category: short(c.category, 100),
        durationMinutes: c.duration, price: c.price, enrollment: statuses.get(String(c._id)) || 'not_enrolled',
      }));
    const data = {
      profile: { role: user.role, level: input.details.level, activeCourses: enrollments.filter(e => e.status === 'active').length, completedCourses: enrollments.filter(e => e.status === 'completed').length },
      request: input.details, courses: candidates,
    };
    if (input.mode === 'recommend') return {
      data,
      instruction: 'Chỉ xuất JSON hợp lệ dạng {"recommendations":[{"courseId":"id trong danh sách","reason":"Lý do phù hợp mục tiêu và trình độ"}]}. Chọn tối đa 3 khóa học phù hợp từ courses, không bịa khóa/ID. Nếu không có khóa phù hợp trả mảng rỗng. Không đề xuất khóa ngoài danh sách. Dữ liệu profile là thống kê học tập của người dùng; không cần thông tin cá nhân.',
      finish: text => {
        const result = parseJson(text);
        if (!Array.isArray(result.recommendations) || result.recommendations.length > 3) throw new ServiceError(502, 'Danh sách gợi ý AI không hợp lệ. Vui lòng thử lại.');
        const seen = new Set();
        const recommendations = result.recommendations.map(item => {
          const course = candidates.find(c => c.id === item?.courseId);
          if (!course || seen.has(course.id) || !validText(item.reason, 800)) throw new ServiceError(502, 'AI đề xuất khóa học không hợp lệ. Vui lòng thử lại.');
          seen.add(course.id);
          return { id: course.id, title: course.title, reason: item.reason.trim(), price: course.price, url: `/courses/${course.id}` };
        });
        return { mode: input.mode, recommendations, answer: recommendations.length
          ? `### Khóa học phù hợp\n\n${recommendations.map((c, i) => `${i + 1}. **${escapeMd(c.title)}**\n\n   ${escapeMd(c.reason)}\n\n   [Xem khóa học](${c.url})`).join('\n\n')}`
          : 'Hiện chưa tìm thấy khóa học phù hợp trong danh mục khả dụng, sau khi loại các khóa bạn đã đăng ký hoặc hoàn thành. Hãy thử mục tiêu khác.' };
      },
      ...(candidates.length ? {} : { immediate: { mode: input.mode, recommendations: [], answer: 'Hiện không có khóa học mới khả dụng để đề xuất. Các khóa đã đăng ký hoặc hoàn thành không được gợi ý lại.' } }),
    };
    const { weeks, daysPerWeek, minutesPerDay } = input.details;
    return {
      data,
      instruction: `Chỉ xuất JSON hợp lệ dạng {"weeks":[{"week":1,"focus":"chủ đề","activities":"nhiệm vụ chia theo buổi","outcome":"kết quả tự kiểm tra","courseId":null}]}. Phải có đúng ${weeks} tuần, đánh số liên tiếp từ 1. Mỗi tuần mô tả ${daysPerWeek} buổi, mỗi buổi ${minutesPerDay} phút. Mỗi trường văn bản tối đa 1200 ký tự. courseId chỉ được lấy từ courses hoặc null; không bịa tên khóa học ngoài danh sách. Kế hoạch phải tăng dần theo trình độ và có ôn tập. Không cam kết thành thạo hoặc hoàn thành toàn khóa khi quỹ thời gian không đủ. Với catalog rỗng, lập kế hoạch tự học.`,
      finish: text => {
        const result = parseJson(text);
        if (!Array.isArray(result.weeks) || result.weeks.length !== weeks) throw new ServiceError(502, 'Kế hoạch AI chưa đủ số tuần yêu cầu. Vui lòng thử lại.');
        const schedule = result.weeks.map((week, index) => {
          if (!week || week.week !== index + 1 || !['focus', 'activities', 'outcome'].every(key => validText(week[key]))) throw new ServiceError(502, 'Nội dung kế hoạch AI không hợp lệ. Vui lòng thử lại.');
          const course = week.courseId == null ? null : candidates.find(c => c.id === week.courseId);
          if (week.courseId != null && !course) throw new ServiceError(502, 'Kế hoạch chứa khóa học không hợp lệ. Vui lòng thử lại.');
          return { week: index + 1, focus: week.focus.trim(), activities: week.activities.trim(), outcome: week.outcome.trim(), days: daysPerWeek, minutesPerDay,
            ...(course ? { course: { id: course.id, title: course.title, url: `/courses/${course.id}` } } : {}) };
        });
        const studyPlan = { goal: input.details.goal, level: input.details.level, weeks: schedule, totalMinutes: weeks * daysPerWeek * minutesPerDay };
        const answer = `### Kế hoạch học tập\n\n**Mục tiêu:** ${escapeMd(studyPlan.goal)}\n\n**Trình độ:** ${levels[studyPlan.level]} · **Quỹ thời gian:** ${weeks} tuần × ${daysPerWeek} buổi × ${minutesPerDay} phút = ${studyPlan.totalMinutes} phút.\n\n${schedule.map(w => `#### Tuần ${w.week}: ${escapeMd(w.focus)}\n\n${escapeMd(w.activities)}\n\n**Tự kiểm tra:** ${escapeMd(w.outcome)}${w.course ? `\n\n[${escapeMd(w.course.title)}](${w.course.url})` : ''}`).join('\n\n')}`;
        return { mode: input.mode, studyPlan, answer };
      },
    };
  }
}
module.exports = ChatLearningService;
