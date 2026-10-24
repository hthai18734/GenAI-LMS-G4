import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentService, getQuizAttemptSession } from '../features/student/api.js';

export default function StudentQuizResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const session = getQuizAttemptSession(attemptId);

  useEffect(() => {
    (async () => {
      try {
        const response = await studentService.getQuizResult(attemptId);
        setResult(response.data?.result || null);
      } catch (err) {
        setError(err.message || 'Unable to load the quiz result.');
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  if (loading) return <div className="spinner" />;
  if (!result) return <section className="student-quiz-page"><div className="page-error">{error || 'Quiz result is unavailable.'}</div></section>;

  return <section className="student-quiz-page">
    <header className="student-quiz-header"><div><h1>Quiz Result</h1><p>Submitted {result.submittedAt ? new Date(result.submittedAt).toLocaleString('en-US') : 'quiz attempt'}</p></div><strong className={result.passed ? 'student-result-pass' : 'student-result-fail'}>{result.score}%</strong></header>
    <article className={`student-result-summary ${result.passed ? 'student-result-summary-pass' : 'student-result-summary-fail'}`}>
      <strong>{result.passed ? 'Passed' : 'Not passed'}</strong>
      <span>This score was calculated by the server.</span>
    </article>
    <section className="student-result-answers"><h2>Submitted answers</h2>{result.answers?.length ? <ol>{result.answers.map((answer, index) => { const question = session?.questions?.find((item) => item.id === answer.questionId); return <li key={answer.questionId}><strong>{answer.questionText || question?.questionText || `Question ${index + 1}`}</strong><span>{answer.answer || 'No answer submitted'}</span><em className={answer.isCorrect ? 'student-answer-correct' : 'student-answer-incorrect'}>{answer.isCorrect ? 'Correct' : 'Not correct'}</em></li>; })}</ol> : <p>No answers were submitted.</p>}</section>
    <footer className="student-quiz-actions"><button className="ghost" type="button" onClick={() => navigate(result.courseId ? `/courses/${result.courseId}/learn` : '/courses')}>Back to Course</button></footer>
  </section>;
}
