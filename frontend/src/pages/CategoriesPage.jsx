import React, { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import { useToast } from '../components/Toast';

const blank = { name: '', description: '' };
export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getCategories();
      setCategories(res.data?.categories || []);
    } catch (err) {
      setError(err.message || 'Unable to load categories.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const open = (category = null) => {
    setEditing(category || {});
    setForm(category ? { name: category.name, description: category.description || '' } : blank);
    setFieldErrors({});
  };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      if (editing?._id) await adminService.updateCategory(editing._id, form);
      else await adminService.createCategory(form);
      addToast(
        editing?._id ? 'Category updated successfully.' : 'Category created successfully.',
        'success',
      );
      setEditing(null);
      await load();
    } catch (err) {
      setFieldErrors(err.errors || {});
      addToast(err.message || 'Unable to save category.', 'error');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (category) => {
    if (!window.confirm(`Delete category “${category.name}”?`)) return;
    try {
      await adminService.deleteCategory(category._id);
      addToast('Category deleted successfully.', 'success');
      await load();
    } catch (err) {
      addToast(err.message || 'Unable to delete category.', 'error');
    }
  };
  return (
    <section className="management-page">
      <div className="management-header">
        <div>
          <h1>Category Management</h1>
          <p>Create and maintain course categories.</p>
        </div>
        <button className="primary" onClick={() => open()}>
          Create Category
        </button>
      </div>
      {loading ? (
        <div className="spinner" />
      ) : error ? (
        <div className="page-error">
          {error}
          <button className="ghost" onClick={load}>
            Retry
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="empty-state management-card">
          <div className="empty-icon">🏷️</div>
          <h3>No categories found.</h3>
          <p>Create a category to organize your course catalog.</p>
        </div>
      ) : (
        <div className="management-card table-wrap">
          <table className="management-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category._id}>
                  <td>{category.name}</td>
                  <td>{category.description || '—'}</td>
                  <td>
                    <span className="status-badge status-open">
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(category.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <button className="ghost compact" onClick={() => open(category)}>
                      Edit
                    </button>
                    <button className="danger-button compact" onClick={() => remove(category)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="modal-card" onSubmit={submit}>
            <div className="modal-heading">
              <h2>{editing._id ? 'Edit Category' : 'Create Category'}</h2>
              <button type="button" className="icon-button" onClick={() => setEditing(null)}>
                ×
              </button>
            </div>
            <label className="modal-label">
              Name *
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                maxLength="100"
              />
              {fieldErrors.name && <small>{fieldErrors.name}</small>}
            </label>
            <label className="modal-label">
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows="4"
                maxLength="1000"
              />
              {fieldErrors.description && <small>{fieldErrors.description}</small>}
            </label>
            <div className="form-actions">
              <button className="ghost" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
