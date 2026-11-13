import { lazy, Suspense, useEffect, useRef, useState } from 'react';
const ChatAnswer = lazy(() => import('./ChatAnswer'));

const titles = { wrong_answer: 'Explain a wrong answer', recommend: 'Recommend courses', study_plan: 'Create a study plan' };
export default function ChatLearningTools({ busy, onSend, style, mode, onModeChange, turns = [] }) {
  const result = turns.filter(turn => turn.mode === mode).at(-1);
  const resultRef = useRef(null);
  const [submitted, setSubmitted] = useState(null);
  const [values, setValues] = useState({ question: '', studentAnswer: '', correctAnswer: '', goal: '', level: 'beginner', weeks: 4, daysPerWeek: 3, minutesPerDay: 45 });
  const update = event => setValues(previous => ({ ...previous, [event.target.name]: event.target.type === 'number' ? Number(event.target.value) : event.target.value }));
  function submit(event) {
    event.preventDefault();
    const details = mode === 'wrong_answer'
      ? { question: values.question, studentAnswer: values.studentAnswer, correctAnswer: values.correctAnswer }
      : { goal: values.goal, level: values.level, ...(mode === 'study_plan' ? { weeks: values.weeks, daysPerWeek: values.daysPerWeek, minutesPerDay: values.minutesPerDay } : {}) };
    const requestId = crypto.randomUUID();
    setSubmitted(requestId);
    onSend({ text: titles[mode], mode, style, details, requestId });
  }
  useEffect(() => {
    if (result?.requestId === submitted) resultRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [result?.requestId, submitted]);
  return <div className={`ai-chat-learning ${mode ? 'ai-chat-learning-active' : ''}`}>
    <div className="ai-chat-tool-buttons" aria-label="Learning tools">
      {Object.entries(titles).map(([key, title]) => <button key={key} type="button" disabled={busy} aria-expanded={mode === key} onClick={() => onModeChange(key)}>{title}</button>)}
    </div>
    {mode && <form className="ai-chat-tool-form" onSubmit={submit}>
      <div className="ai-chat-tool-heading"><strong>{titles[mode]}</strong><button type="button" onClick={() => onModeChange('')} aria-label="Return to general chat">← General chat</button></div>
      {mode === 'wrong_answer' ? <>
        <p>Enter the question and answer to review. AI also considers the open lesson; this is not an official grade.</p>
        <label>Question<textarea name="question" required maxLength={1500} rows={2} value={values.question} onChange={update} /></label>
        <label>Your answer<textarea name="studentAnswer" required maxLength={1000} rows={2} value={values.studentAnswer} onChange={update} /></label>
        <label>Reference answer (optional)<textarea name="correctAnswer" maxLength={1000} rows={1} value={values.correctAnswer} onChange={update} /></label>
      </> : <>
        <p>{mode === 'recommend' ? 'Recommendations use your goal, level, and enrollment history. Only real courses that you have not enrolled in are suggested.' : 'Create a weekly schedule with tasks for each session and self-checks. The plan is saved in your chat history.'}</p>
        <label>Learning goal<textarea name="goal" required maxLength={500} rows={2} placeholder="Example: learn JavaScript to build a course management website" value={values.goal} onChange={update} /></label>
        <label>Current level<select name="level" value={values.level} onChange={update}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
        {mode === 'study_plan' && <div className="ai-chat-schedule-fields">
          <label>Weeks<input name="weeks" type="number" min="1" max="12" required value={values.weeks} onChange={update} /></label>
          <label>Days per week<input name="daysPerWeek" type="number" min="1" max="7" required value={values.daysPerWeek} onChange={update} /></label>
          <label>Minutes per day<input name="minutesPerDay" type="number" min="15" max="180" required value={values.minutesPerDay} onChange={update} /></label>
        </div>}
      </>}
      <button type="submit" className="ai-chat-send" disabled={busy}>{busy ? 'Processing…' : titles[mode]}</button>
    </form>}
    {mode && busy && <p className="ai-chat-tool-status" role="status">AI is processing your request. The result will appear below.</p>}
    {mode && result && <section className="ai-chat-tool-result" ref={resultRef} aria-label={`${titles[mode]} result`} aria-live="polite">
      <h3>{titles[mode]} result</h3>
      <p className="ai-chat-tool-request">{result.question}</p>
      <div className="ai-chat-answer"><Suspense fallback={<p>Formatting result…</p>}><ChatAnswer text={result.answer} /></Suspense></div>
    </section>}
  </div>;
}
