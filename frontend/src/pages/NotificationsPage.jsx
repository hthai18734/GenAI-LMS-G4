import { useEffect, useState } from 'react';
import { notificationService } from '../features/engagement/api.js';
import { useToast } from '../components/Toast';

export default function NotificationsPage() {
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const res = await notificationService.getNotifications(20, page);
        if (cancelled) return;
        if (page > res.data.pagination.totalPages) { setPage(res.data.pagination.totalPages); return; }
        setData(res.data);
      } catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [page, reload]);
  async function action(operation) {
    setBusy(true);
    try {
      const res = await operation();
      setConfirm(null); setReload(n => n + 1); addToast(res.message, 'success');
      window.dispatchEvent(new Event('notification-updated'));
    } catch (err) { addToast(err.message, 'error'); }
    finally { setBusy(false); }
  }
  return <section className="management-page">
    <div className="management-header"><div><h2>Notifications</h2><p>{data ? `${data.unreadCount} unread notifications` : 'Your notification inbox'}</p></div><button className="primary" disabled={busy || loading || !data?.unreadCount} onClick={() => action(() => notificationService.markAllNotificationsRead())}>Mark all as read</button></div>
    {loading ? <div className="spinner" /> : error ? <div className="page-error">{error}<button className="ghost" onClick={() => setReload(n => n + 1)}>Retry</button></div> : <>
      {!data?.notifications.length && <div className="empty-state management-card">No notifications yet.</div>}
      {data?.notifications.map(item => <article key={item.id} className="management-card" style={{ marginBottom: 12, borderLeft: item.isRead ? undefined : '4px solid #2563eb' }}>
        <h3>{item.title} {!item.isRead && <small>· Unread</small>}</h3><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.message}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
        <div className="form-actions">{!item.isRead && <button className="ghost" disabled={busy} onClick={() => action(() => notificationService.markNotificationRead(item.id))}>Mark as read</button>}<button className="ghost" disabled={busy} onClick={() => setConfirm(item)}>Delete</button></div>
      </article>)}
      {data?.pagination && <div className="form-actions"><button className="ghost" disabled={busy || !data.pagination.hasPrevPage} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} / {data.pagination.totalPages}</span><button className="ghost" disabled={busy || !data.pagination.hasNextPage} onClick={() => setPage(page + 1)}>Next</button></div>}
    </>}
    {confirm && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-notification-title"><div className="modal-card"><h2 id="delete-notification-title">Delete notification?</h2><p>{confirm.title}</p><p>This cannot be undone.</p><div className="form-actions"><button className="ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button className="primary" disabled={busy} onClick={() => action(() => notificationService.deleteNotification(confirm.id))}>{busy ? 'Deleting...' : 'Delete'}</button></div></div></div>}
  </section>;
}
