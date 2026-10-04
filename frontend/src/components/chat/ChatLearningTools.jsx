import { lazy, Suspense, useEffect, useRef, useState } from 'react';
const ChatAnswer = lazy(() => import('./ChatAnswer'));

const titles = {
  wrong_answer: 'Giải thích đáp án sai',
  recommend: 'Gợi ý khóa học',
  study_plan: 'Lập kế hoạch học',
};
export default function ChatLearningTools({ busy, onSend, style, mode, onModeChange, turns = [] }) {
  const result = turns.filter((turn) => turn.mode === mode).at(-1);
  const resultRef = useRef(null);
  const [submitted, setSubmitted] = useState(null);
  const [values, setValues] = useState({
    question: '',
    studentAnswer: '',
    correctAnswer: '',
    goal: '',
    level: 'beginner',
    weeks: 4,
    daysPerWeek: 3,
    minutesPerDay: 45,
  });
  const update = (event) =>
    setValues((previous) => ({
      ...previous,
      [event.target.name]:
        event.target.type === 'number' ? Number(event.target.value) : event.target.value,
    }));
  function submit(event) {
    event.preventDefault();
    const details =
      mode === 'wrong_answer'
        ? {
            question: values.question,
            studentAnswer: values.studentAnswer,
            correctAnswer: values.correctAnswer,
          }
        : {
            goal: values.goal,
            level: values.level,
            ...(mode === 'study_plan'
              ? {
                  weeks: values.weeks,
                  daysPerWeek: values.daysPerWeek,
                  minutesPerDay: values.minutesPerDay,
                }
              : {}),
          };
    const requestId = crypto.randomUUID();
    setSubmitted(requestId);
    onSend({ text: titles[mode], mode, style, details, requestId });
  }
  useEffect(() => {
    if (result?.requestId === submitted)
      resultRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [result?.requestId, submitted]);
  return (
    <div className={`ai-chat-learning ${mode ? 'ai-chat-learning-active' : ''}`}>
      <div className="ai-chat-tool-buttons" aria-label="Công cụ học tập">
        {Object.entries(titles).map(([key, title]) => (
          <button
            key={key}
            type="button"
            disabled={busy}
            aria-expanded={mode === key}
            onClick={() => onModeChange(key)}
          >
            {title}
          </button>
        ))}
      </div>
      {mode && (
        <form className="ai-chat-tool-form" onSubmit={submit}>
          <div className="ai-chat-tool-heading">
            <strong>{titles[mode]}</strong>
            <button type="button" onClick={() => onModeChange('')} aria-label="Quay lại chat tổng">
              ← Chat tổng
            </button>
          </div>
          {mode === 'wrong_answer' ? (
            <>
              <p>
                Nhập câu hỏi và đáp án cần kiểm tra. AI đối chiếu thêm bài học đang mở; đây không
                phải kết quả chấm điểm.
              </p>
              <label>
                Đề bài
                <textarea
                  name="question"
                  required
                  maxLength={1500}
                  rows={2}
                  value={values.question}
                  onChange={update}
                />
              </label>
              <label>
                Câu trả lời của bạn
                <textarea
                  name="studentAnswer"
                  required
                  maxLength={1000}
                  rows={2}
                  value={values.studentAnswer}
                  onChange={update}
                />
              </label>
              <label>
                Đáp án tham khảo (nếu có)
                <textarea
                  name="correctAnswer"
                  maxLength={1000}
                  rows={1}
                  value={values.correctAnswer}
                  onChange={update}
                />
              </label>
            </>
          ) : (
            <>
              <p>
                {mode === 'recommend'
                  ? 'Dựa trên mục tiêu, trình độ và lịch sử đăng ký của bạn. Chỉ gợi ý khóa học có thật, chưa đăng ký.'
                  : 'Tạo lịch học theo tuần, nhiệm vụ từng buổi và cách tự kiểm tra. Kế hoạch được lưu trong lịch sử chat.'}
              </p>
              <label>
                Mục tiêu học tập
                <textarea
                  name="goal"
                  required
                  maxLength={500}
                  rows={2}
                  placeholder="Ví dụ: học JavaScript để làm website quản lý khóa học"
                  value={values.goal}
                  onChange={update}
                />
              </label>
              <label>
                Trình độ hiện tại
                <select name="level" value={values.level} onChange={update}>
                  <option value="beginner">Mới bắt đầu</option>
                  <option value="intermediate">Trung bình</option>
                  <option value="advanced">Nâng cao</option>
                </select>
              </label>
              {mode === 'study_plan' && (
                <div className="ai-chat-schedule-fields">
                  <label>
                    Số tuần
                    <input
                      name="weeks"
                      type="number"
                      min="1"
                      max="12"
                      required
                      value={values.weeks}
                      onChange={update}
                    />
                  </label>
                  <label>
                    Ngày/tuần
                    <input
                      name="daysPerWeek"
                      type="number"
                      min="1"
                      max="7"
                      required
                      value={values.daysPerWeek}
                      onChange={update}
                    />
                  </label>
                  <label>
                    Phút/ngày
                    <input
                      name="minutesPerDay"
                      type="number"
                      min="15"
                      max="180"
                      required
                      value={values.minutesPerDay}
                      onChange={update}
                    />
                  </label>
                </div>
              )}
            </>
          )}
          <button type="submit" className="ai-chat-send" disabled={busy}>
            {busy ? 'Đang xử lý…' : titles[mode]}
          </button>
        </form>
      )}
      {mode && busy && (
        <p className="ai-chat-tool-status" role="status">
          AI đang xử lý yêu cầu. Bạn có thể xem kết quả ngay bên dưới.
        </p>
      )}
      {mode && result && (
        <section
          className="ai-chat-tool-result"
          ref={resultRef}
          aria-label={`Kết quả ${titles[mode]}`}
          aria-live="polite"
        >
          <h3>Kết quả {titles[mode].toLowerCase()}</h3>
          <p className="ai-chat-tool-request">{result.question}</p>
          <div className="ai-chat-answer">
            <Suspense fallback={<p>Đang định dạng kết quả…</p>}>
              <ChatAnswer text={result.answer} />
            </Suspense>
          </div>
        </section>
      )}
    </div>
  );
}
