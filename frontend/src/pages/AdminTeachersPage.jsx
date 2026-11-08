import { useEffect, useState } from 'react';
import { adminService } from '../features/admin/api.js';
import { useToast } from '../components/toastContext';

export default function AdminTeachersPage() {
  const { addToast } = useToast();
  const [query, setQuery] = useState({ page: 1, search: '', teachingStatus: '' });
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null); // { teacher, action: 'suspend' | 'unsuspend' }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try { const res = await adminService.getTeachers({ ...query, limit: 10 }); if (!cancelled) setData(res.data); }
      catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [query, reload]);

  async function detail(id) {
    setBusy(true);
    try { setSelected((await adminService.getTeacher(id)).data.teacher); }
    catch (err) { addToast(err.message, 'error'); }
    finally { setBusy(false); }
  }

  async function handleToggleSuspend() {
    if (!confirm) return;
    setBusy(true);
    try {
      const isSuspending = confirm.action === 'suspend';
      const res = isSuspending
        ? await adminService.suspendTeacher(confirm.teacher._id)
        : await adminService.unsuspendTeacher(confirm.teacher._id);

      if (selected?._id === confirm.teacher._id) setSelected(res.data.teacher);
      setConfirm(null);
      setReload(n => n + 1);
      addToast(res.message, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="management-page">
      <div className="management-header">
        <div>
          <h2>Teacher Management</h2>
          <p>View teachers and manage teaching privileges. Account access is retained even when suspended.</p>
        </div>
      </div>
      <form className="management-filters" onSubmit={e => { e.preventDefault(); setQuery({ ...query, page: 1, search: search.trim() }); }}>
        <input aria-label="Search teachers" placeholder="Name or email" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} />
        <button className="ghost">Search</button>
        <select aria-label="Teaching status" value={query.teachingStatus} onChange={e => setQuery({ ...query, page: 1, teachingStatus: e.target.value })}>
          <option value="">All teaching statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </form>

      {loading ? (
        <div className="spinner" />
      ) : error ? (
        <div className="page-error">{error}<button className="ghost" onClick={() => setReload(n => n + 1)}>Retry</button></div>
      ) : (
        <>
          <div className="management-card table-wrap">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Account status</th>
                  <th>Teaching status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.teachers.map(teacher => {
                  const isSuspended = teacher.teachingStatus === 'suspended';
                  return (
                    <tr key={teacher._id}>
                      <td><strong>{teacher.fullName}</strong></td>
                      <td>{teacher.email}</td>
                      <td>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '12px',
                          background: teacher.status === 'active' ? '#dcfce7' : '#f3f4f6',
                          color: teacher.status === 'active' ? '#166534' : '#6b7280'
                        }}>
                          {teacher.status}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                          background: isSuspended ? '#fee2e2' : '#dcfce7',
                          color: isSuspended ? '#991b1b' : '#166534'
                        }}>
                          {isSuspended ? '● Suspended' : '● Active'}
                        </span>
                      </td>
                      <td>
                        <div className="form-actions" style={{ gap: '6px' }}>
                          <button className="ghost compact" disabled={busy} onClick={() => detail(teacher._id)}>
                            View detail
                          </button>
                          {isSuspended ? (
                            <button
                              className="compact"
                              style={{
                                background: '#10b981', color: '#fff', border: 'none',
                                padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
                              }}
                              disabled={busy}
                              onClick={() => setConfirm({ teacher, action: 'unsuspend' })}
                            >
                              ✓ Unsuspend
                            </button>
                          ) : (
                            <button
                              className="compact"
                              style={{
                                background: '#ef4444', color: '#fff', border: 'none',
                                padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
                              }}
                              disabled={busy}
                              onClick={() => setConfirm({ teacher, action: 'suspend' })}
                            >
                              ⊘ Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!data?.teachers.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>No teachers found.</td></tr>}
              </tbody>
            </table>
          </div>
          {data?.pagination && (
            <div className="form-actions">
              <button className="ghost" disabled={!data.pagination.hasPrevPage} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Previous</button>
              <span>Page {data.pagination.page} / {data.pagination.totalPages}</span>
              <button className="ghost" disabled={!data.pagination.hasNextPage} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next</button>
            </div>
          )}
        </>
      )}

      {selected && !confirm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="teacher-title">
          <div className="modal-card">
            <h2 id="teacher-title">{selected.fullName}</h2>
            <dl className="review-details">
              {[
                ['Email', selected.email],
                ['Phone', selected.phone || 'Not provided'],
                ['Account status', selected.status],
                ['Teaching status', selected.teachingStatus === 'suspended' ? 'Suspended' : 'Active'],
                ['Joined', new Date(selected.createdAt).toLocaleDateString()]
              ].map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <div className="form-actions">
              <button className="ghost" onClick={() => setSelected(null)}>Close</button>
              {selected.teachingStatus === 'suspended' ? (
                <button
                  className="primary"
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                  disabled={busy}
                  onClick={() => setConfirm({ teacher: selected, action: 'unsuspend' })}
                >
                  ✓ Unsuspend teaching
                </button>
              ) : (
                <button
                  className="primary"
                  style={{ background: '#ef4444', borderColor: '#ef4444' }}
                  disabled={busy}
                  onClick={() => setConfirm({ teacher: selected, action: 'suspend' })}
                >
                  ⊘ Suspend teaching
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="suspend-title">
          <div className="modal-card">
            <h2 id="suspend-title">
              {confirm.action === 'suspend'
                ? `Suspend ${confirm.teacher.fullName}?`
                : `Restore teaching privileges for ${confirm.teacher.fullName}?`}
            </h2>
            <p style={{ lineHeight: '1.6', color: 'var(--text-dim, #555)' }}>
              {confirm.action === 'suspend'
                ? 'This teacher will temporarily lose access to teaching portals, course creation, and content editing. Their account remains active and they can still log in and view notifications.'
                : 'This will restore all teaching privileges. The teacher will be able to access the teacher dashboard, create and edit courses, and conduct classes immediately.'}
            </p>
            <div className="form-actions">
              <button className="ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className="primary"
                style={{
                  background: confirm.action === 'suspend' ? '#ef4444' : '#10b981',
                  borderColor: confirm.action === 'suspend' ? '#ef4444' : '#10b981'
                }}
                disabled={busy}
                onClick={handleToggleSuspend}
              >
                {busy ? 'Processing...' : confirm.action === 'suspend' ? 'Confirm suspension' : 'Confirm restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
