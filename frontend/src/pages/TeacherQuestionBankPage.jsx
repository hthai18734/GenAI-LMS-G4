import React, { useCallback, useEffect, useState } from 'react';
import { teacherService } from '../features/teacher/api.js';
import { useToast } from '../components/toastContext';

const blankQuestion = { questionText: '', options: ['', ''], correctAnswer: '', explanation: '', categoryId: '' };

export default function TeacherQuestionBankPage() {
  const { addToast, confirmToast } = useToast();

  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Form modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [formData, setFormData] = useState(blankQuestion);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async (signal) => {
    try {
      const res = await teacherService.getCategories({ signal });
      setCategories(res.data?.categories || []);
    } catch (error) {
      if (error.name === 'AbortError') return;
      // ignore
    }
  }, []);

  const loadQuestions = useCallback(async (kw, cat, signal) => {
    setLoading(true);
    try {
      const res = await teacherService.listQuestions({
        keyword: kw,
        categoryId: cat,
        limit: 100,
      }, { signal });
      setQuestions(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      if (err.name === 'AbortError') return;
      addToast(err.message || 'Unable to load Question Bank.', 'error');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadCategories(controller.signal));
    return () => controller.abort();
  }, [loadCategories]);

  // Direct live search & filter with debounce for keyword
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadQuestions(keyword, categoryId, controller.signal);
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [keyword, categoryId, loadQuestions]);

  const openCreateModal = () => {
    setEditingQuestionId(null);
    setFormData(blankQuestion);
    setFormErrors({});
    setFormModalOpen(true);
  };

  const openEditModal = (q) => {
    setEditingQuestionId(q._id);
    setFormData({
      questionText: q.questionText,
      options: q.options || ['', ''],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      categoryId: q.categoryId?._id || q.categoryId || '',
    });
    setFormErrors({});
    setFormModalOpen(true);
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: null }));
  };

  const updateOption = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? value : opt)),
    }));
    setFormErrors((prev) => ({ ...prev, options: null, correctAnswer: null }));
  };

  const addOption = () => {
    setFormData((prev) => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
      correctAnswer: prev.correctAnswer === prev.options[index] ? '' : prev.correctAnswer,
    }));
  };

  const validateForm = () => {
    const errors = {};
    const cleanOptions = formData.options.map((o) => o.trim()).filter(Boolean);
    if (!formData.questionText.trim()) errors.questionText = 'Question text is required.';
    if (cleanOptions.length < 2 || cleanOptions.length !== formData.options.length) {
      errors.options = 'At least two non-empty options are required.';
    }
    if (!formData.correctAnswer || !cleanOptions.includes(formData.correctAnswer)) {
      errors.correctAnswer = 'Please choose a correct answer from the options.';
    }
    return { errors, cleanOptions };
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    const { errors, cleanOptions } = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const payload = {
        questionText: formData.questionText.trim(),
        options: cleanOptions,
        correctAnswer: formData.correctAnswer,
        explanation: formData.explanation.trim(),
        categoryId: formData.categoryId || null,
      };

      if (editingQuestionId) {
        await teacherService.updateQuestion(editingQuestionId, payload);
        addToast('Question updated successfully!', 'success');
      } else {
        await teacherService.createBankQuestion(payload);
        addToast('Question added to Question Bank successfully!', 'success');
      }
      setFormModalOpen(false);
      loadQuestions();
    } catch (err) {
      addToast(err.message || 'Error saving question.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (q) => {
    const confirmed = await confirmToast(
      `Permanently delete question "${q.questionText.substring(0, 50)}..." from Question Bank? This cannot be undone.`,
      { type: 'error', confirmLabel: 'Delete Question' }
    );
    if (!confirmed) return;

    try {
      const res = await teacherService.deleteQuestion(q._id);
      addToast(res.message || 'Question deleted successfully.', 'success');
      loadQuestions();
    } catch (err) {
      // Handles 409 Conflict if used in active quizzes
      addToast(err.message || 'Cannot delete this question because it is currently linked to active quizzes. Please remove it from those quizzes first.', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px' }}>📚 My Question Bank</h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
            Manage and reuse your multiple-choice questions across different quizzes and courses.
          </p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openCreateModal} style={{ padding: '10px 22px' }}>
          + Create New Question
        </button>
      </div>

      {/* Filter toolbar */}
      <div
        style={{
          background: 'var(--panel)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--line)',
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '12px', color: 'var(--muted)', pointerEvents: 'none', fontSize: '15px' }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search question text directly..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: '100%', padding: '9px 36px 9px 38px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '14px' }}
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Category:</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '14px', minWidth: '180px' }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Question List */}
      {loading ? (
        <div className="spinner" style={{ margin: '60px auto' }} />
      ) : questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--panel)', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
          <h3 style={{ margin: '0 0 8px' }}>No questions found</h3>
          <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: '14px' }}>
            Start creating questions to save to your Question Bank and reuse anytime!
          </p>
          <button className="btn btn-primary" type="button" onClick={openCreateModal}>
            + Create First Question
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', paddingLeft: '4px' }}>
            Total: <strong>{total}</strong> question(s)
          </div>
          {questions.map((q, idx) => (
            <div
              key={q._id}
              style={{
                background: '#fff',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '16px' }}>
                      {idx + 1}. {q.questionText}
                    </strong>
                    {q.categoryId && (
                      <span style={{ fontSize: '12px', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '12px' }}>
                        {q.categoryId?.name || categories.find((c) => c._id === q.categoryId)?.name || 'Category'}
                      </span>
                    )}
                  </div>
                  <small style={{ color: 'var(--muted)' }}>
                    Created: {new Date(q.createdAt).toLocaleDateString()}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="ghost compact" type="button" onClick={() => openEditModal(q)}>
                    Edit
                  </button>
                  <button
                    className="danger-button compact"
                    type="button"
                    onClick={() => handleDeleteQuestion(q)}
                    title="Delete permanently from Question Bank (blocked if linked to any active quiz)"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ paddingLeft: '16px', borderLeft: '3px solid #e2e8f0', margin: '12px 0 8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                  {q.options?.map((opt, oIdx) => (
                    <div
                      key={`${opt}-${oIdx}`}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: opt === q.correctAnswer ? '#dcfce7' : '#f8fafc',
                        border: `1px solid ${opt === q.correctAnswer ? '#86efac' : '#e2e8f0'}`,
                        fontSize: '13px',
                        fontWeight: opt === q.correctAnswer ? '600' : 'normal',
                        color: opt === q.correctAnswer ? '#166534' : 'inherit',
                      }}
                    >
                      {opt} {opt === q.correctAnswer && <span style={{ marginLeft: '4px' }}>✓ (Correct answer)</span>}
                    </div>
                  ))}
                </div>
              </div>

              {q.explanation && (
                <div style={{ fontSize: '13px', color: 'var(--muted)', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', marginTop: '8px' }}>
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {formModalOpen && (
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
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>
                {editingQuestionId ? '✏️ Edit Question' : '➕ Create New Question in Bank'}
              </h2>
              <button className="ghost" onClick={() => setFormModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => updateField('categoryId', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                >
                  <option value="">-- Select category (Optional) --</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Question text *
                </label>
                <textarea
                  value={formData.questionText}
                  onChange={(e) => updateField('questionText', e.target.value)}
                  rows="3"
                  placeholder="Enter multiple-choice question content..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                />
                {formErrors.questionText && <small style={{ color: 'red' }}>{formErrors.questionText}</small>}
              </div>

              <fieldset style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <legend style={{ fontWeight: '500', padding: '0 8px' }}>Options *</legend>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {formData.options.map((opt, idx) => (
                    <div key={`option-${idx}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ minWidth: '70px', fontSize: '13px', color: 'var(--muted)' }}>Option {idx + 1}:</span>
                      <input
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder={`Option ${idx + 1} text`}
                        style={{ flex: 1, padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--line)' }}
                      />
                      {formData.options.length > 2 && (
                        <button className="ghost compact" type="button" onClick={() => removeOption(idx)} style={{ color: '#ef4444' }}>
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button className="ghost compact" type="button" onClick={addOption} style={{ marginTop: '10px' }}>
                  + Add Option
                </button>
                {formErrors.options && <small style={{ color: 'red', display: 'block', marginTop: '4px' }}>{formErrors.options}</small>}
              </fieldset>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Correct answer *
                </label>
                <select
                  value={formData.correctAnswer}
                  onChange={(e) => updateField('correctAnswer', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                >
                  <option value="">-- Select a correct answer --</option>
                  {formData.options
                    .filter((o) => o.trim())
                    .map((opt) => (
                      <option key={opt} value={opt.trim()}>
                        {opt.trim()}
                      </option>
                    ))}
                </select>
                {formErrors.correctAnswer && <small style={{ color: 'red' }}>{formErrors.correctAnswer}</small>}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
                  Explanation (Optional)
                </label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => updateField('explanation', e.target.value)}
                  rows="2"
                  placeholder="Explain why this answer is correct..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="ghost" type="button" onClick={() => setFormModalOpen(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingQuestionId ? 'Update Question' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
