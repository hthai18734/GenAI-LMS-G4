import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentService, saveQuizAttemptSession } from '../features/student/api.js';
import { useToast } from '../components/toastContext';

export default function StudentQuizStartPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setError('');
    try {
      const result = await studentService.startQuiz(quizId);
      const session = result.data;
      const attemptId = session?.attempt?.id;
      if (!attemptId || !Array.isArray(session.questions)) throw new Error('Quiz session could not be started.');
      saveQuizAttemptSession(attemptId, { ...session, answers: {}, submitted: false });
      addToast(result.message || 'Quiz attempt started successfully.', 'success');
      navigate(`/quiz-attempts/${attemptId}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to start this quiz.');
    } finally {
      setStarting(false);
    }
  };

  return <section className="student-quiz-page">
    <header className="student-quiz-header"><div><h1>Start Quiz</h1><p>Start only when you are ready. The server will confirm availability, access, deadline, and remaining attempts.</p></div></header>
    {error && <div className="page-error">{error}</div>}
    <article className="student-quiz-start-card">
      <h2>Ready to begin?</h2>
      <p>Once started, the quiz session follows the time limit provided by the server.</p>
      <footer><button className="ghost" type="button" onClick={() => navigate(-1)} disabled={starting}>Cancel</button><button className="primary" type="button" onClick={start} disabled={starting}>{starting ? 'Starting…' : 'Start Quiz'}</button></footer>
    </article>
  </section>;
}
