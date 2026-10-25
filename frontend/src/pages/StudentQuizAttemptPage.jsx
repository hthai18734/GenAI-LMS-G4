import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentService, getQuizAttemptSession, saveQuizAttemptSession } from '../features/student/api.js';
import { useToast } from '../components/Toast';

function remainingLabel(expiresAt) {
  const milliseconds = new Date(expiresAt).getTime() - Date.now();
  if (milliseconds <= 0) return 'Time expired';
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')} remaining`;
}

export default function StudentQuizAttemptPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { addToast, confirmToast } = useToast();
  const [session, setSession] = useState(() => getQuizAttemptSession(attemptId));
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.submitted) navigate(`/quiz-attempts/${attemptId}/result`, { replace: true });
  }, [attemptId, navigate, session?.submitted]);

  useEffect(() => {
    if (!session?.attempt?.expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.attempt?.expiresAt]);

  const expired = useMemo(() => !session?.attempt?.expiresAt || new Date(session.attempt.expiresAt).getTime() <= now, [now, session]);

  const selectAnswer = (questionId, answer) => {
    setSession((current) => {
      const updated = { ...current, answers: { ...(current.answers || {}), [questionId]: answer } };
      saveQuizAttemptSession(attemptId, updated);
      return updated;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (expired || submitting || confirming) return;
    setConfirming(true);
    const confirmed = await confirmToast('Submit your quiz answers? You will not be able to change this attempt afterward.', { confirmLabel: 'Submit' });
    setConfirming(false);
    if (!confirmed) return;
    setSubmitting(true);
    setError('');
    try {
      const answers = session.questions.flatMap((question) => session.answers?.[question.id] ? [{ questionId: question.id, answer: session.answers[question.id] }] : []);
      const result = await studentService.submitQuiz(attemptId, { answers });
      const updated = { ...session, submitted: true };
      saveQuizAttemptSession(attemptId, updated);
      addToast(result.message || 'Quiz submitted successfully.', 'success');
      navigate(`/quiz-attempts/${attemptId}/result`, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to submit this quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!session?.attempt || !session?.quiz || !Array.isArray(session.questions)) return <section className="student-quiz-page"><div className="page-error">Quiz session information is unavailable. Return to the quiz link to start a new attempt if allowed.</div></section>;

  return <section className="student-quiz-page">
    <header className="student-quiz-header"><div><h1>{session.quiz.title}</h1><p>Choose an answer for any question you want to submit. Scores are calculated by the server after submission.</p></div><strong className={expired ? 'student-quiz-expired' : 'student-quiz-time'}>{remainingLabel(session.attempt.expiresAt)}</strong></header>
    {error && <div className="page-error">{error}</div>}
    {expired && <article className="student-quiz-notice"><strong>This attempt has expired.</strong><span>The server will not accept a late submission.</span></article>}
    <form className="student-quiz-form" onSubmit={submit} noValidate>
      {session.questions.length === 0 ? <article className="student-quiz-notice"><strong>No questions are available.</strong><span>You can submit the attempt if you are finished.</span></article> : session.questions.map((question, index) => <fieldset className="student-question" key={question.id}><legend>{index + 1}. {question.questionText}</legend>{question.options.map((option, optionIndex) => <label key={`${option}-${optionIndex}`}><input type="radio" name={question.id} value={option} checked={session.answers?.[question.id] === option} onChange={() => selectAnswer(question.id, option)} disabled={submitting || expired} /><span>{option}</span></label>)}</fieldset>)}
      <footer className="student-quiz-actions"><button className="primary" disabled={submitting || confirming || expired}>{submitting ? 'Submitting…' : confirming ? 'Awaiting confirmation…' : 'Submit Quiz'}</button></footer>
    </form>
  </section>;
}
