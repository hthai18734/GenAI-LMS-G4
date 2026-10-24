import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../features/admin/api.js';

export default function AdminAccountsPage() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const res = await adminService.getUsers(page, filters);
        if (!cancelled) { setUsers(res.data.users); setPagination(res.data.pagination); }
      } catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [page, filters, reload]);

  const filterBy = (field, value) => { setPage(1); setFilters({ ...filters, [field]: value }); };
  const submitSearch = (event) => { event.preventDefault(); filterBy('search', search.trim()); };

  return <section className="management-page">
    <div className="management-header"><div><h1>Account & User Management</h1><p>Search accounts, view details and manage users.</p></div><Link className="primary" to="/admin/users/new">Create User</Link></div>
    <form className="management-filters" onSubmit={submitSearch}>
      <input aria-label="Search accounts" placeholder="Search by name or email" value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} />
      <button className="ghost">Search</button>
      <select aria-label="Filter by role" value={filters.role} onChange={(event) => filterBy('role', event.target.value)}><option value="">All roles</option>{['student', 'teacher', 'admin'].map((role) => <option key={role} value={role}>{role}</option>)}</select>
      <select aria-label="Filter by status" value={filters.status} onChange={(event) => filterBy('status', event.target.value)}><option value="">All statuses</option>{['pending', 'active', 'inactive'].map((status) => <option key={status} value={status}>{status}</option>)}</select>
    </form>
    {loading ? <div className="spinner" /> : error ? <div className="page-error">{error}<button className="ghost" onClick={() => setReload(reload + 1)}>Retry</button></div> : users.length === 0 ? <div className="empty-state management-card"><h3>No accounts found.</h3></div> :
      <div className="management-card table-wrap"><table className="management-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user._id}><td>{user.fullName}</td><td>{user.email}</td><td>{user.role}</td><td>{user.status}</td><td><Link to={'/admin/users/' + user._id}>View detail</Link> <Link to={'/admin/users/' + user._id + '/edit'}>Edit</Link></td></tr>)}</tbody></table></div>}
    {!loading && !error && pagination && <div className="form-actions"><button className="ghost" disabled={!pagination.hasPrevPage} onClick={() => setPage(page - 1)}>Previous</button><span>Page {pagination.page} / {pagination.totalPages}</span><button className="ghost" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)}>Next</button></div>}
  </section>;
}
