import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { teacherService } from '../services/api';
import { useToast } from '../components/Toast';

const blankQuestion = { questionText: '', options: ['', ''], correctAnswer: '', explanation: '' };
const normalizeQuestion = question => {
  if (question.explanation || !question.questionText?.includes('\n\nExplanation:')) return question;
  const [questionText, ...explanation] = question.questionText.split('\n\nExplanation:');
  return { ...question, questionText, explanation: explanation.join('\n\nExplanation:').trim() };
};

function validateQuiz(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Quiz title is required.';
  if (!Number.isInteger(Number(form.timeLimit)) || Number(form.timeLimit) < 1) errors.timeLimit = 'Enter a whole number greater than zero.';
  if (!Number.isFinite(Number(form.passingScore)) || Number(form.passingScore) < 0 || Number(form.passingScore) > 100) errors.passingScore = 'Enter a score from 0 to 100.';
  if (!Number.isInteger(Number(form.attemptLimit)) || Number(form.attemptLimit) < 1) errors.attemptLimit = 'Enter at least one attempt.';
  return errors;
}

function validateQuestion(question) {
  const errors = {};
  const options = question.options.map((option) => option.trim()).filter(Boolean);
  if (!question.questionText.trim()) errors.questionText = 'Question text is required.';
  if (options.length < 2 || options.length !== question.options.length) errors.options = 'Provide at least two non-empty options.';
  if (!question.correctAnswer || !options.includes(question.correctAnswer)) errors.correctAnswer = 'Choose a correct answer from the options.';
  return { errors, options };
}

export default function TeacherQuizWorkspacePage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { addToast, confirmToast } = useToast();
  const [quiz, setQuiz] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizForm, setQuizForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState(blankQuestion);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [quizErrors, setQuizErrors] = useState({});
  const [questionErrors, setQuestionErrors] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const quizResult = await teacherService.getQuiz(quizId);
        const loadedQuiz = quizResult.data?.quiz;
        if (!loadedQuiz) throw new Error('Quiz not found.');
        setQuiz(loadedQuiz);
        setQuestions((quizResult.data?.questions || []).map(normalizeQuestion));
        setQuizForm({ title: loadedQuiz.title || '', lessonId: loadedQuiz.lessonId || '', timeLimit: String(loadedQuiz.timeLimit ?? ''), passingScore: String(loadedQuiz.passingScore ?? ''), attemptLimit: String(loadedQuiz.attemptLimit ?? '') });
        const lessonResult = await teacherService.getLessons(loadedQuiz.courseId);
        setLessons(lessonResult.data?.lessons || []);
      } catch (err) {
        setError(err.message || 'Unable to load this quiz.');
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  const updateQuiz = (event) => {
    const { name, value } = event.target;
    setQuizForm((current) => ({ ...current, [name]: value }));
    setQuizErrors((current) => ({ ...current, [name]: null }));
  };

  const saveQuiz = async (event) => {
    event.preventDefault();
    const errors = validateQuiz(quizForm);
    setQuizErrors(errors);
    if (Object.keys(errors).length) return;
    setSavingQuiz(true);
    try {
      const result = await teacherService.updateQuiz(quizId, { title: quizForm.title.trim(), lessonId: quizForm.lessonId || null, timeLimit: Number(quizForm.timeLimit), passingScore: Number(quizForm.passingScore), attemptLimit: Number(quizForm.attemptLimit) });
      const updated = result.data?.quiz;
      setQuiz(updated);
      setQuizForm({ title: updated.title || '', lessonId: updated.lessonId || '', timeLimit: String(updated.timeLimit), passingScore: String(updated.passingScore), attemptLimit: String(updated.attemptLimit) });
      addToast(result.message || 'Quiz updated successfully.', 'success');
    } catch (err) {
      setError(err.message || 'Unable to update quiz.');
      setQuizErrors(err.errors || {});
    } finally {
      setSavingQuiz(false);
    }
  };

  const deleteQuiz = async () => {
    const confirmed = await confirmToast('Delete this quiz? This removes the quiz from future teacher views.', { type: 'error', confirmLabel: 'Delete' });
    if (!confirmed) return;
    setDeleting(true);
    try {
      const result = await teacherService.deleteQuiz(quizId);
      addToast(result.message || 'Quiz deleted successfully.', 'success');
      navigate('/teacher/quizzes/new');
    } catch (err) {
      addToast(err.message || 'Unable to delete quiz.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const updateQuestionField = (event) => {
    const { name, value } = event.target;
    setQuestionForm((current) => ({ ...current, [name]: value }));
    setQuestionErrors((current) => ({ ...current, [name]: null }));
  };

  const updateOption = (index, value) => {
    setQuestionForm((current) => ({ ...current, options: current.options.map((option, optionIndex) => optionIndex === index ? value : option) }));
    setQuestionErrors((current) => ({ ...current, options: null, correctAnswer: null }));
  };

  const addOption = () => setQuestionForm((current) => ({ ...current, options: [...current.options, ''] }));
  const removeOption = (index) => setQuestionForm((current) => ({ ...current, options: current.options.filter((_, optionIndex) => optionIndex !== index), correctAnswer: current.correctAnswer === current.options[index] ? '' : current.correctAnswer }));
  const resetQuestion = () => { setQuestionForm(blankQuestion); setEditingQuestionId(null); setQuestionErrors({}); };

  const saveQuestion = async (event) => {
    event.preventDefault();
    const { errors, options } = validateQuestion(questionForm);
    setQuestionErrors(errors);
    if (Object.keys(errors).length) return;
    setSavingQuestion(true);
    try {
      const payload = { questionText: questionForm.questionText.trim(), options, correctAnswer: questionForm.correctAnswer, explanation: questionForm.explanation.trim() };
      const result = editingQuestionId ? await teacherService.updateQuestion(editingQuestionId, payload) : await teacherService.createQuestion(quizId, payload);
      const question = result.data?.question;
      setQuestions((current) => editingQuestionId ? current.map((item) => item._id === editingQuestionId ? question : item) : [...current, question]);
      addToast(result.message || (editingQuestionId ? 'Question updated successfully.' : 'Question added successfully.'), 'success');
      resetQuestion();
    } catch (err) {
      setQuestionErrors(err.errors || { payload: err.message || 'Unable to save question.' });
    } finally {
      setSavingQuestion(false);
    }
  };

  const editQuestion = (question) => {
    setEditingQuestionId(question._id);
    setQuestionForm({ questionText: question.questionText, options: question.options, correctAnswer: question.correctAnswer, explanation: question.explanation || '' });
    setQuestionErrors({});
  };

  const deleteQuestion = async (question) => {
    const confirmed = await confirmToast(`Delete question “${question.questionText}”?`, { type: 'error', confirmLabel: 'Delete' });
    if (!confirmed) return;
    try {
      const result = await teacherService.deleteQuestion(question._id);
      setQuestions((current) => current.filter((item) => item._id !== question._id));
      if (editingQuestionId === question._id) resetQuestion();
      addToast(result.message || 'Question deleted successfully.', 'success');
    } catch (err) {
      addToast(err.message || 'Unable to delete question.', 'error');
    }
  };

  if (loading) return <div className="spinner" />;
  if (!quiz || !quizForm) return <section className="management-page assessment-page"><div className="page-error">{error || 'Quiz not found.'}<button className="ghost" onClick={() => navigate('/teacher/quizzes/new')}>Create Quiz</button></div></section>;

  return <section className="management-page assessment-page">
    <button className="ghost" type="button" onClick={() => navigate(`/teacher/courses/${quiz.courseId}/edit#activities`)} style={{ marginBottom: '16px' }}>← Back to course activities</button>
    <header className="management-header assessment-header"><div><h1>{quiz.title}</h1><p>Quiz configuration and question bank.</p></div><button className="danger-button" type="button" onClick={deleteQuiz} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete Quiz'}</button></header>
    {error && <div className="page-error">{error}</div>}
    <article className="assessment-context"><span>Course ID: {quiz.courseId}</span><span>{quiz.lessonId ? 'Linked to a lesson' : 'Course-level quiz'}</span></article>
    <form className="assessment-form" onSubmit={saveQuiz} noValidate>
      <h2>Quiz configuration</h2>
      <label>Quiz title *<input name="title" value={quizForm.title} onChange={updateQuiz} maxLength="200" disabled={savingQuiz} />{quizErrors.title && <small>{quizErrors.title}</small>}</label>
      <label>Related lesson<select name="lessonId" value={quizForm.lessonId} onChange={updateQuiz} disabled={savingQuiz}><option value="">Course-level quiz</option>{lessons.map((lesson) => <option key={lesson._id} value={lesson._id}>{lesson.order}. {lesson.title}</option>)}</select>{quizErrors.lessonId && <small>{quizErrors.lessonId}</small>}</label>
      <fieldset className="assessment-grid">
        <label>Time limit (minutes) *<input name="timeLimit" type="number" min="1" step="1" value={quizForm.timeLimit} onChange={updateQuiz} disabled={savingQuiz} />{quizErrors.timeLimit && <small>{quizErrors.timeLimit}</small>}</label>
        <label>Passing score (%) *<input name="passingScore" type="number" min="0" max="100" step="1" value={quizForm.passingScore} onChange={updateQuiz} disabled={savingQuiz} />{quizErrors.passingScore && <small>{quizErrors.passingScore}</small>}</label>
        <label>Attempt limit *<input name="attemptLimit" type="number" min="1" step="1" value={quizForm.attemptLimit} onChange={updateQuiz} disabled={savingQuiz} />{quizErrors.attemptLimit && <small>{quizErrors.attemptLimit}</small>}</label>
      </fieldset>
      <footer className="form-actions"><button className="primary" disabled={savingQuiz}>{savingQuiz ? 'Saving…' : 'Save Quiz'}</button></footer>
    </form>
    <section className="assessment-section">
      <header className="assessment-section-header"><h2>Questions</h2><p>All questions saved in this quiz appear here.</p></header>
      {questions.length === 0 ? <article className="assessment-empty"><strong>No questions have been saved yet.</strong><span>Add a multiple-choice question below.</span></article> : <div className="assessment-question-list">{questions.map((question, index) => <article className="assessment-question" key={question._id}><header><strong>{index + 1}. {question.questionText}</strong><nav><button className="ghost compact" type="button" onClick={() => editQuestion(question)}>Edit</button><button className="danger-button compact" type="button" onClick={() => deleteQuestion(question)}>Delete</button></nav></header><ol>{question.options.map((option, optionIndex) => <li key={`${option}-${optionIndex}`}>{option}{option === question.correctAnswer && <strong>Correct answer</strong>}</li>)}</ol>{question.explanation && <p><strong>Explanation:</strong> {question.explanation}</p>}</article>)}</div>}
      <form className="assessment-form question-form" onSubmit={saveQuestion} noValidate>
        <h3>{editingQuestionId ? 'Edit Question' : 'Add Question'}</h3>
        {questionErrors.payload && <div className="page-error">{questionErrors.payload}</div>}
        <label>Question text *<textarea name="questionText" value={questionForm.questionText} onChange={updateQuestionField} rows="4" disabled={savingQuestion} />{questionErrors.questionText && <small>{questionErrors.questionText}</small>}</label>
        <fieldset className="question-options"><legend>Options *</legend>{questionForm.options.map((option, index) => <label key={`option-${index}`}>Option {index + 1}<input value={option} onChange={(event) => updateOption(index, event.target.value)} disabled={savingQuestion} />{questionForm.options.length > 2 && <button className="ghost compact" type="button" onClick={() => removeOption(index)}>Remove</button>}</label>)}<button className="ghost compact" type="button" onClick={addOption} disabled={savingQuestion}>Add Option</button>{questionErrors.options && <small>{questionErrors.options}</small>}</fieldset>
        <label>Correct answer *<select name="correctAnswer" value={questionForm.correctAnswer} onChange={updateQuestionField} disabled={savingQuestion}><option value="">Select the correct option</option>{questionForm.options.filter((option) => option.trim()).map((option) => <option key={option} value={option.trim()}>{option.trim()}</option>)}</select>{questionErrors.correctAnswer && <small>{questionErrors.correctAnswer}</small>}</label>
        <label>Explanation (optional)<textarea name="explanation" value={questionForm.explanation} onChange={updateQuestionField} rows="3" disabled={savingQuestion} /></label>
        <footer className="form-actions">{editingQuestionId && <button className="ghost" type="button" onClick={resetQuestion}>Cancel Edit</button>}<button className="primary" disabled={savingQuestion}>{savingQuestion ? 'Saving…' : editingQuestionId ? 'Update Question' : 'Add Question'}</button></footer>
      </form>
    </section>
  </section>;
}
