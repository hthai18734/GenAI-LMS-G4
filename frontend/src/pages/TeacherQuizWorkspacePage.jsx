import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/Toast';
import {
  BLANK_QUESTION,
  normalizeQuestion,
  quizPayload,
  quizToForm,
  relationId,
  validateQuestion,
  validateQuiz,
} from '../features/teacher/quizModel.js';

export default function TeacherQuizWorkspacePage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { addToast, confirmToast } = useToast();
  const [quiz, setQuiz] = useState(null);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [courseQuizzes, setCourseQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [quizForm, setQuizForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState(BLANK_QUESTION);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionUsageCount, setQuestionUsageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [quizErrors, setQuizErrors] = useState({});
  const [questionErrors, setQuestionErrors] = useState({});

  // Question Bank Modal State
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankKeyword, setBankKeyword] = useState('');
  const [bankCategory, setBankCategory] = useState('');
  const [selectedBankIds, setSelectedBankIds] = useState(new Set());
  const [linkingBank, setLinkingBank] = useState(false);

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
        setQuizForm(quizToForm(loadedQuiz));

        // Load Course info for default category
        try {
          const courseRes = await teacherService.getCourse(loadedQuiz.courseId);
          setCourse(courseRes.data?.course || null);
        } catch {
          // ignore course load error
        }

        const lessonResult = await teacherService.getLessons(loadedQuiz.courseId);
        setLessons(lessonResult.data?.lessons || []);

        const quizzesResult = await teacherService.listQuizzes(loadedQuiz.courseId);
        setCourseQuizzes(quizzesResult.data?.quizzes || []);

        const catResult = await teacherService.getCategories();
        setCategories(catResult.data?.categories || []);
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
      const payload = quizPayload(quizForm);
      const result = await teacherService.updateQuiz(quizId, payload);
      const updated = result.data?.quiz;
      setQuiz(updated);
      setQuizForm(quizToForm(updated));
      addToast(result.message || 'Quiz updated successfully.', 'success');
    } catch (err) {
      setError(err.message || 'Unable to update quiz.');
      setQuizErrors(err.errors || {});
    } finally {
      setSavingQuiz(false);
    }
  };

  const deleteQuiz = async () => {
    const confirmed = await confirmToast(
      'Delete this quiz? The quiz will be removed, but all questions will remain safely in your Question Bank.',
      { type: 'error', confirmLabel: 'Delete' }
    );
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
    setQuestionForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
    }));
    setQuestionErrors((current) => ({ ...current, options: null, correctAnswer: null }));
  };

  const addOption = () => setQuestionForm((current) => ({ ...current, options: [...current.options, ''] }));
  const removeOption = (index) =>
    setQuestionForm((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
      correctAnswer: current.correctAnswer === current.options[index] ? '' : current.correctAnswer,
    }));

  const resetQuestion = () => {
    setQuestionForm({ ...BLANK_QUESTION, options: [...BLANK_QUESTION.options], categoryId: course?.categoryId || '' });
    setEditingQuestionId(null);
    setQuestionUsageCount(0);
    setQuestionErrors({});
  };

  const openCreateQuestionModal = () => {
    resetQuestion();
    setQuestionModalOpen(true);
  };

  const closeQuestionModal = () => {
    setQuestionModalOpen(false);
    resetQuestion();
  };

  const saveQuestion = async (event) => {
    event.preventDefault();
    const { errors, options } = validateQuestion(questionForm);
    setQuestionErrors(errors);
    if (Object.keys(errors).length) return;

    if (editingQuestionId && questionUsageCount > 1) {
      const confirmed = await confirmToast(
        `This question is used in ${questionUsageCount} quizzes. Changes will apply to all quizzes using this question. Do you want to continue?`,
        { confirmLabel: 'Update All' }
      );
      if (!confirmed) return;
    }

    setSavingQuestion(true);
    try {
      const payload = {
        questionText: questionForm.questionText.trim(),
        options,
        correctAnswer: questionForm.correctAnswer,
        explanation: questionForm.explanation.trim(),
        categoryId: questionForm.categoryId || course?.categoryId || null,
      };
      const result = editingQuestionId
        ? await teacherService.updateQuestion(editingQuestionId, payload)
        : await teacherService.createQuestion(quizId, payload);
      const savedQuestion = result.data?.question;
      setQuestions((current) =>
        editingQuestionId
          ? current.map((item) => (item._id === editingQuestionId ? normalizeQuestion(savedQuestion) : item))
          : [...current, normalizeQuestion(savedQuestion)]
      );
      addToast(result.message || (editingQuestionId ? 'Question updated successfully.' : 'Question created and added to quiz successfully.'), 'success');
      closeQuestionModal();
    } catch (err) {
      setQuestionErrors(err.errors || { payload: err.message || 'Unable to save question.' });
    } finally {
      setSavingQuestion(false);
    }
  };

  const editQuestion = async (question) => {
    setEditingQuestionId(question._id);
    setQuestionForm({
      questionText: question.questionText,
      options: question.options || ['', ''],
      correctAnswer: question.correctAnswer || '',
      explanation: question.explanation || '',
      categoryId: question.categoryId?._id || question.categoryId || course?.categoryId || '',
    });
    setQuestionErrors({});
    setQuestionModalOpen(true);

    try {
      const res = await teacherService.getQuestion(question._id);
      const details = res.data?.question;
      if (details) {
        setQuestionUsageCount(details.usageCount || 1);
      }
    } catch {
      setQuestionUsageCount(1);
    }
  };

  // Unlink question from this Quiz (keeps question safely in Question Bank)
  const unlinkQuestion = async (question) => {
    const confirmed = await confirmToast(
      `Remove question "${question.questionText.substring(0, 50)}..." from this quiz? The question will stay safely in your Question Bank and will not affect other quizzes.`,
      { confirmLabel: 'Remove from Quiz' }
    );
    if (!confirmed) return;
    try {
      await teacherService.unlinkQuestionFromQuiz(quizId, question._id);
      setQuestions((current) => current.filter((item) => item._id !== question._id));
      if (editingQuestionId === question._id) closeQuestionModal();
      addToast('Question removed from quiz (kept in Question Bank).', 'success');
    } catch (err) {
      addToast(err.message || 'Unable to unlink question.', 'error');
    }
  };

  // Open Question Bank Modal with Course Category defaulted
  const openBankModal = () => {
    const defaultCat = course?.categoryId || '';
    setBankModalOpen(true);
    setSelectedBankIds(new Set());
    setBankKeyword('');
    setBankCategory(defaultCat);
    loadBankQuestions('', defaultCat);
  };

  const loadBankQuestions = async (kw = bankKeyword, cat = bankCategory) => {
    setBankLoading(true);
    try {
      const res = await teacherService.listQuestions({
        keyword: kw,
        categoryId: cat,
        limit: 100,
      });
      setBankQuestions(res.data?.items || []);
    } catch (err) {
      addToast(err.message || 'Unable to load Question Bank.', 'error');
    } finally {
      setBankLoading(false);
    }
  };

  // Live filter/search directly whenever bankKeyword or bankCategory changes
  useEffect(() => {
    if (!bankModalOpen) return;
    const timer = setTimeout(() => {
      loadBankQuestions(bankKeyword, bankCategory);
    }, 250);
    return () => clearTimeout(timer);
  }, [bankKeyword, bankCategory, bankModalOpen]);

  const toggleSelectBankQuestion = (id) => {
    setSelectedBankIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelectedFromBank = async () => {
    if (!selectedBankIds.size) return;
    setLinkingBank(true);
    try {
      await teacherService.batchLinkQuestionsToQuiz(quizId, Array.from(selectedBankIds));
      // Refresh quiz questions
      const quizResult = await teacherService.getQuiz(quizId);
      setQuestions((quizResult.data?.questions || []).map(normalizeQuestion));
      addToast(`Added ${selectedBankIds.size} question(s) from Question Bank!`, 'success');
      setBankModalOpen(false);
    } catch (err) {
      addToast(err.message || 'Failed to add questions from bank.', 'error');
    } finally {
      setLinkingBank(false);
    }
  };

  if (loading) return <div className="spinner" />;
  if (!quiz || !quizForm) {
    return (
      <section className="management-page assessment-page">
        <div className="page-error">
          {error || 'Quiz not found.'}
          <button className="ghost" onClick={() => navigate('/teacher/quizzes/new')}>
            Create Quiz
          </button>
        </div>
      </section>
    );
  }

  const existingQuestionIds = new Set(questions.map((q) => String(q._id)));

  return (
    <section className="management-page assessment-page" style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="ghost" type="button" onClick={() => navigate(`/teacher/courses/${quiz.courseId}/edit#activities`)}>
          ← Back to course activities
        </button>
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={() => navigate('/teacher/questions')}
        >
          📂 Go to Question Bank
        </button>
      </div>

      <header className="management-header assessment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px' }}>{quiz.title}</h1>
          <p style={{ margin: 0, color: 'var(--muted)' }}>Quiz configuration and reusable questions.</p>
        </div>
        <button className="danger-button" type="button" onClick={deleteQuiz} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete Quiz'}
        </button>
      </header>

      {error && <div className="page-error" style={{ marginBottom: '16px' }}>{error}</div>}

      <article className="assessment-context" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: 'var(--panel)', padding: '14px 20px', borderRadius: '12px', border: '1px solid var(--line)', marginBottom: '28px', fontSize: '14px' }}>
        <span><strong>Course:</strong> {course?.title || quiz.courseId}</span>
        <span><strong>Location:</strong> {quiz.lessonId ? 'Linked to lesson' : 'Course-level quiz'}</span>
        {course?.categoryId && <span><strong>Default Category:</strong> {categories.find((c) => c._id === course.categoryId)?.name || 'Custom'}</span>}
      </article>

      {/* Quiz Configuration Form */}
      <form className="assessment-form" onSubmit={saveQuiz} noValidate style={{ background: 'var(--panel)', padding: '24px', borderRadius: '14px', border: '1px solid var(--line)', marginBottom: '32px' }}>
        <h2 style={{ marginTop: 0, fontSize: '18px', marginBottom: '18px' }}>⚙️ Quiz Configuration</h2>
        <label style={{ display: 'block', marginBottom: '16px' }}>
          Switch quiz
          <select value={quizId} onChange={(event) => navigate(`/teacher/quizzes/${event.target.value}`)} disabled={savingQuiz} style={{ width: '100%', padding: '9px 12px', marginTop: '6px' }}>
            {courseQuizzes.map((courseQuiz) => <option key={courseQuiz._id} value={courseQuiz._id}>{courseQuiz.title}</option>)}
          </select>
          <small style={{ display: 'block', color: 'var(--muted)', marginTop: '5px' }}>Selecting another quiz loads that quiz and its own questions.</small>
        </label>
        <label style={{ display: 'block', marginBottom: '16px' }}>
          Quiz title *
          <input name="title" value={quizForm.title} onChange={updateQuiz} maxLength="200" disabled={savingQuiz} style={{ width: '100%', padding: '9px 12px', marginTop: '6px' }} />
          {quizErrors.title && <small style={{ color: 'red' }}>{quizErrors.title}</small>}
        </label>

        <label style={{ display: 'block', marginBottom: '16px' }}>
          Related lesson
          <select name="lessonId" value={quizForm.lessonId} onChange={updateQuiz} disabled={savingQuiz} style={{ width: '100%', padding: '9px 12px', marginTop: '6px' }}>
            <option value="">Course-level quiz</option>
            {lessons.map((lesson) => (
              <option key={lesson._id} value={lesson._id}>
                {lesson.order}. {lesson.title}
              </option>
            ))}
          </select>
          <small style={{ display: 'block', color: 'var(--muted)', marginTop: '5px' }}>If the selected lesson already has a quiz, its questions are loaded automatically.</small>
          {quizErrors.lessonId && <small style={{ color: 'red' }}>{quizErrors.lessonId}</small>}
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <label>
            Time limit (minutes) *
            <input name="timeLimit" type="number" min="1" step="1" value={quizForm.timeLimit} onChange={updateQuiz} disabled={savingQuiz} style={{ width: '100%', padding: '9px 12px', marginTop: '6px' }} />
            {quizErrors.timeLimit && <small style={{ color: 'red' }}>{quizErrors.timeLimit}</small>}
          </label>
          <label>
            Passing score (%) *
            <input name="passingScore" type="number" min="0" max="100" step="1" value={quizForm.passingScore} onChange={updateQuiz} disabled={savingQuiz} style={{ width: '100%', padding: '9px 12px', marginTop: '6px' }} />
            {quizErrors.passingScore && <small style={{ color: 'red' }}>{quizErrors.passingScore}</small>}
          </label>
          <label>
            Attempt limit *
            <input name="attemptLimit" type="number" min="1" step="1" value={quizForm.attemptLimit} onChange={updateQuiz} disabled={savingQuiz} style={{ width: '100%', padding: '9px 12px', marginTop: '6px' }} />
            {quizErrors.attemptLimit && <small style={{ color: 'red' }}>{quizErrors.attemptLimit}</small>}
          </label>
        </div>

        <footer className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="primary" disabled={savingQuiz} style={{ padding: '10px 24px' }}>
            {savingQuiz ? 'Saving…' : 'Save Quiz Configuration'}
          </button>
        </footer>
      </form>

      {/* Questions Section */}
      <section className="assessment-section" style={{ background: 'var(--panel)', padding: '24px', borderRadius: '14px', border: '1px solid var(--line)' }}>
        <header className="assessment-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px' }}>📋 Questions in this Quiz ({questions.length})</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>
              Questions are linked from your Question Bank and can be reused across courses.
            </p>
          </div>
          {questions.length > 0 && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={openBankModal}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                📥 Add from Question Bank
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={openCreateQuestionModal}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                + Create New Question
              </button>
            </div>
          )}
        </header>

        {/* Question List */}
        {questions.length === 0 ? (
          <article
            className="assessment-empty"
            style={{
              textAlign: 'center',
              padding: '44px 24px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: '42px', marginBottom: '12px', lineHeight: 1 }}>📭</div>
            <strong style={{ fontSize: '16px', color: '#1e293b', marginBottom: '6px' }}>
              No questions in this quiz yet
            </strong>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px', maxWidth: '440px', lineHeight: 1.5 }}>
              Add existing questions from your Question Bank or create a new question directly.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={openBankModal}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px' }}
              >
                📥 Add from Question Bank
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={openCreateQuestionModal}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px' }}
              >
                + Create New Question
              </button>
            </div>
          </article>
        ) : (
          <div className="assessment-question-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {questions.map((question, index) => (
              <article
                className="assessment-question"
                key={question._id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '18px',
                  background: 'var(--card-bg, #fff)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '15px', lineHeight: '1.4' }}>
                      {index + 1}. {question.questionText}
                    </strong>
                    {question.categoryId && (
                      <span
                        style={{
                          marginLeft: '10px',
                          fontSize: '12px',
                          background: '#e0e7ff',
                          color: '#3730a3',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: '500',
                          verticalAlign: 'middle',
                        }}
                      >
                        {categories.find((c) => c._id === (question.categoryId?._id || question.categoryId))?.name || 'Category'}
                      </span>
                    )}
                  </div>
                  <nav style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button className="ghost compact" type="button" onClick={() => editQuestion(question)}>
                      Edit
                    </button>
                    <button
                      className="ghost compact"
                      type="button"
                      style={{ color: '#d97706' }}
                      title="Remove from this quiz (keeps in Question Bank)"
                      onClick={() => unlinkQuestion(question)}
                    >
                      Remove from Quiz
                    </button>
                  </nav>
                </header>
                <ol style={{ paddingLeft: '22px', margin: '10px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {question.options.map((option, optionIndex) => (
                    <li
                      key={`${option}-${optionIndex}`}
                      style={{
                        padding: '4px 0',
                        fontSize: '14px',
                        fontWeight: option === question.correctAnswer ? '600' : 'normal',
                        color: option === question.correctAnswer ? '#16a34a' : 'inherit',
                      }}
                    >
                      {option} {option === question.correctAnswer && <span style={{ marginLeft: '6px' }}>✓ (Correct answer)</span>}
                    </li>
                  ))}
                </ol>
                {question.explanation && (
                  <p style={{ margin: '10px 0 0', fontSize: '13px', color: 'var(--muted)', background: 'rgba(0,0,0,0.02)', padding: '10px 14px', borderRadius: '8px' }}>
                    <strong>Explanation:</strong> {question.explanation}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Question Form Modal (Create / Edit) */}
      {questionModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '14px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>
                {editingQuestionId ? '✏️ Edit Question' : '➕ Create New Question & Add to Quiz'}
              </h2>
              <button className="ghost" type="button" onClick={closeQuestionModal} style={{ fontSize: '18px' }}>
                ✕
              </button>
            </div>

            {editingQuestionId && questionUsageCount > 1 && (
              <div
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  marginBottom: '18px',
                  lineHeight: '1.4',
                }}
              >
                ⚠️ <strong>Notice:</strong> This question is currently used in <strong>{questionUsageCount}</strong> quizzes. Changes will apply to all quizzes using this question.
              </div>
            )}

            <form onSubmit={saveQuestion} noValidate>
              {questionErrors.payload && <div className="page-error" style={{ marginBottom: '14px' }}>{questionErrors.payload}</div>}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Category
                </label>
                <select
                  name="categoryId"
                  value={questionForm.categoryId}
                  onChange={updateQuestionField}
                  disabled={savingQuestion}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '14px' }}
                >
                  <option value="">-- Default from Course ({categories.find((c) => c._id === course?.categoryId)?.name || 'None'}) --</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Question text *
                </label>
                <textarea
                  name="questionText"
                  value={questionForm.questionText}
                  onChange={updateQuestionField}
                  rows="3"
                  disabled={savingQuestion}
                  placeholder="Enter multiple-choice question content..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '14px' }}
                />
                {questionErrors.questionText && <small style={{ color: 'red' }}>{questionErrors.questionText}</small>}
              </div>

              <fieldset style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <legend style={{ fontWeight: '500', padding: '0 8px', fontSize: '14px' }}>Options *</legend>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {questionForm.options.map((option, index) => (
                    <div key={`option-${index}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ minWidth: '70px', fontSize: '13px', color: 'var(--muted)' }}>Option {index + 1}:</span>
                      <input
                        value={option}
                        onChange={(event) => updateOption(index, event.target.value)}
                        disabled={savingQuestion}
                        style={{ flex: 1, padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--line)' }}
                        placeholder={`Option ${index + 1} text`}
                      />
                      {questionForm.options.length > 2 && (
                        <button className="ghost compact" type="button" onClick={() => removeOption(index)} style={{ color: '#ef4444' }}>
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button className="ghost compact" type="button" onClick={addOption} disabled={savingQuestion} style={{ marginTop: '10px' }}>
                  + Add Option
                </button>
                {questionErrors.options && <small style={{ color: 'red', display: 'block', marginTop: '6px' }}>{questionErrors.options}</small>}
              </fieldset>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Correct answer *
                </label>
                <select
                  name="correctAnswer"
                  value={questionForm.correctAnswer}
                  onChange={updateQuestionField}
                  disabled={savingQuestion}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '14px' }}
                >
                  <option value="">Select a correct answer</option>
                  {questionForm.options
                    .filter((option) => option.trim())
                    .map((option) => (
                      <option key={option} value={option.trim()}>
                        {option.trim()}
                      </option>
                    ))}
                </select>
                {questionErrors.correctAnswer && <small style={{ color: 'red' }}>{questionErrors.correctAnswer}</small>}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Explanation (optional)
                </label>
                <textarea
                  name="explanation"
                  value={questionForm.explanation}
                  onChange={updateQuestionField}
                  rows="2"
                  disabled={savingQuestion}
                  placeholder="Explain why this answer is correct..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '14px' }}
                />
              </div>

              <footer style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                <button className="ghost" type="button" onClick={closeQuestionModal} disabled={savingQuestion}>
                  Cancel
                </button>
                <button className="primary" disabled={savingQuestion} style={{ padding: '9px 22px' }}>
                  {savingQuestion ? 'Saving…' : editingQuestionId ? 'Update Question' : 'Save & Add to Quiz'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pick from Question Bank */}
      {bankModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>📂 Add from Question Bank</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                  Select one or more questions to link to this quiz.
                </p>
              </div>
              <button className="ghost" onClick={() => setBankModalOpen(false)} style={{ fontSize: '18px' }}>
                ✕
              </button>
            </div>

            {/* Filter toolbar: live search & filter */}
            <div style={{ padding: '16px 20px', background: 'var(--panel)', borderBottom: '1px solid var(--line)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: 'var(--muted)', pointerEvents: 'none', fontSize: '15px' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search question text directly..."
                  value={bankKeyword}
                  onChange={(e) => setBankKeyword(e.target.value)}
                  style={{ width: '100%', padding: '8px 36px 8px 36px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '14px' }}
                />
                {bankKeyword && (
                  <button
                    type="button"
                    onClick={() => setBankKeyword('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      fontSize: '14px',
                      padding: '4px',
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                value={bankCategory}
                onChange={(e) => setBankCategory(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--line)', minWidth: '180px', fontSize: '14px' }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Questions list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {bankLoading ? (
                <div className="spinner" style={{ margin: '40px auto' }} />
              ) : bankQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  No questions found in Question Bank.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {bankQuestions.map((q) => {
                    const alreadyInQuiz = existingQuestionIds.has(String(q._id));
                    const isSelected = selectedBankIds.has(String(q._id));

                    return (
                      <div
                        key={q._id}
                        onClick={() => !alreadyInQuiz && toggleSelectBankQuestion(String(q._id))}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px',
                          borderRadius: '8px',
                          border: `1px solid ${isSelected ? '#3b82f6' : 'var(--line)'}`,
                          background: alreadyInQuiz ? '#f3f4f6' : isSelected ? '#eff6ff' : '#fff',
                          cursor: alreadyInQuiz ? 'not-allowed' : 'pointer',
                          opacity: alreadyInQuiz ? 0.7 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={alreadyInQuiz || isSelected}
                          disabled={alreadyInQuiz}
                          onChange={() => {}}
                          style={{ marginTop: '4px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '14px' }}>{q.questionText}</strong>
                            {alreadyInQuiz && (
                              <span style={{ fontSize: '11px', background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: '4px' }}>
                                In this Quiz
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                            {q.options?.length || 0} options · Answer: <span style={{ color: '#16a34a' }}>{q.correctAnswer}</span>
                            {q.categoryId && (
                              <span style={{ marginLeft: '10px', background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: '4px' }}>
                                {categories.find((c) => c._id === (q.categoryId?._id || q.categoryId))?.name || 'Category'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal actions */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Selected: <strong>{selectedBankIds.size}</strong> question(s)
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="ghost" type="button" onClick={() => setBankModalOpen(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={!selectedBankIds.size || linkingBank}
                  onClick={handleAddSelectedFromBank}
                >
                  {linkingBank ? 'Adding…' : `Add to Quiz (${selectedBankIds.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
