import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { voucherService } from '../features/voucher/api.js';
import { useToast } from "../components/toastContext";
import VoucherRedemptionHistory from "../components/VoucherRedemptionHistory";
const empty = {
  code: "",
  discountPercent: "",
  quantity: "",
  startDate: "",
  endDate: "",
  minOrderValue: "",
  maxDiscountValue: "",
  status: "active",
};
const labels = {
  code: "Code",
  discountPercent: "Discount (%)",
  quantity: "Usage limit (blank = unlimited)",
  startDate: "Start date",
  endDate: "End date",
  minOrderValue: "Minimum order",
  maxDiscountValue: "Maximum discount (blank = unlimited)",
};
const dateValue = (value) =>
  value
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    : "";
export default function AdminVouchersPage({ mode = "list" }) {
  const { id } = useParams(),
    navigate = useNavigate(),
    { addToast } = useToast();
  const [data, setData] = useState(null),
    [form, setForm] = useState(empty),
    [query, setQuery] = useState({ keyword: "", status: "", page: 1 });
  const [keyword, setKeyword] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setError("");
      setLoading(true);
      setData(null);
      try {
        if (mode === "new") {
          if (!cancelled) setForm({ ...empty });
          return;
        }
        const res =
          mode === "list"
            ? await voucherService.list(query)
            : await voucherService.detail(id);
        if (cancelled) return;
        setData(res.data);
        if (mode === "edit") {
          const v = res.data.voucher;
          setForm(
            Object.fromEntries(
              Object.keys(empty).map((k) => [
                k,
                k === "startDate" || k === "endDate"
                  ? dateValue(v[k])
                  : (v[k] ?? ""),
              ]),
            ),
          );
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, mode, query, reload]);
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res =
        mode === "new"
          ? await voucherService.create(form)
          : await voucherService.update(id, form);
      addToast(res.message, "success");
      navigate("/admin/vouchers");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function remove(v) {
    if (!window.confirm("Delete voucher " + v.code + "? The voucher will be hidden; its record and redemption history will be retained.")) return;
    setSaving(true);
    try {
      const res = await voucherService.remove(v.voucherID);
      addToast(res.message, "success");
      navigate("/admin/vouchers");
      setReload((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function toggle(v) {
    const next = v.status === "active" ? "inactive" : "active";
    if (
      !window.confirm(
        `${next === "active" ? "Activate" : "Deactivate"} ${v.code}?`,
      )
    )
      return;
    setSaving(true);
    setError("");
    try {
      const res = await voucherService.toggle(v.voucherID, next);
      addToast(res.message, "success");
      setReload((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="management-page">
      <div className="management-header">
        <h1>
          {mode === "list"
            ? "Voucher Management"
            : mode === "detail"
              ? "Voucher Detail"
              : mode === "new"
                ? "Create Voucher"
                : "Update Voucher"}
        </h1>
        {mode === "list" ? (
          <Link className="primary" to="/admin/vouchers/new">
            Create Voucher
          </Link>
        ) : (
          <Link to="/admin/vouchers">Back to vouchers</Link>
        )}
      </div>
      {error && (
        <div role="alert" className="page-error">
          {error}
          <button className="ghost" onClick={() => setReload((n) => n + 1)}>
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <div className="spinner" />
      ) : mode === "list" ? (
        <>
          <form
            className="management-filters"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery({ ...query, keyword: keyword.trim(), page: 1 });
            }}
          >
            <input
              aria-label="Search voucher code"
              placeholder="Search code"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button className="ghost">Search</button>
            <select
              aria-label="Filter voucher status"
              value={query.status}
              onChange={(e) =>
                setQuery({ ...query, status: e.target.value, page: 1 })
              }
            >
              <option value="">All statuses</option>
              {["active", "inactive", "expired"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </form>
          {data && (
            <>
              <p>
                Total: {data.stats.totalVouchers} · Active:{" "}
                {data.stats.activeVouchers} · Expired:{" "}
                {data.stats.expiredVouchers} · Used: {data.stats.totalUsed}
              </p>
              {data.vouchers.length === 0 ? (
                <div className="empty-state management-card">
                  No vouchers found.
                </div>
              ) : (
                <div className="management-card table-wrap">
                  <table className="management-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Discount</th>
                        <th>Status</th>
                        <th>Usage</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.vouchers.map((v) => (
                        <tr key={v.voucherID}>
                          <td>{v.code}</td>
                          <td>{v.discountPercent}%</td>
                          <td>{v.status}</td>
                          <td>
                            {v.usedCount} / {v.quantity ?? "Unlimited"}
                          </td>
                          <td>
                            <Link to={"/admin/vouchers/" + v.voucherID}>
                              Detail
                            </Link>{" "}
                            <Link
                              to={"/admin/vouchers/" + v.voucherID + "/edit"}
                            >
                              Edit
                            </Link>{" "}
                            <button
                              className="danger-button"
                              disabled={saving || v.usedCount > 0}
                              onClick={() => remove(v)}
                            >
                              Delete
                            </button>
                            {v.status !== "expired" && (
                              <button
                                className="ghost"
                                disabled={saving}
                                onClick={() => toggle(v)}
                              >
                                {v.status === "active"
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="form-actions">
                <button
                  className="ghost"
                  disabled={data.page <= 1}
                  onClick={() => setQuery({ ...query, page: data.page - 1 })}
                >
                  Previous
                </button>
                <span>
                  Page {data.page} / {data.totalPages}
                </span>
                <button
                  className="ghost"
                  disabled={data.page >= data.totalPages}
                  onClick={() => setQuery({ ...query, page: data.page + 1 })}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      ) : mode === "detail" ? (
        data && (
          <div className="management-card course-form">
            <dl className="review-details">
              {Object.entries(data.voucher).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v === null ? "Unlimited / not set" : String(v)}</dd>
                </div>
              ))}
            </dl>
            <div className="form-actions">
              <Link to={"/admin/vouchers/" + id + "/edit"}>Edit Voucher</Link>
              <button
                className="danger-button"
                disabled={saving || data.voucher.usedCount > 0}
                onClick={() => remove(data.voucher)}
              >
                Delete Voucher
              </button>
              {data.voucher.status !== "expired" && (
                <button
                  className="ghost"
                  disabled={saving}
                  onClick={() => toggle(data.voucher)}
                >
                  {data.voucher.status === "active" ? "Deactivate" : "Activate"}
                </button>
              )}
            </div>
            <VoucherRedemptionHistory key={id} voucherId={id} />
          </div>
        )
      ) : (
        (!error || mode === "new" || data) && (
          <form className="management-card course-form" onSubmit={save}>
            {Object.entries(labels).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type={
                    key.endsWith("Date")
                      ? "date"
                      : key === "code"
                        ? "text"
                        : "number"
                  }
                  step={key === "quantity" ? "1" : "any"}
                  value={form[key]}
                  required={key === "code" || key === "discountPercent"}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
            {mode === "edit" && (
              <label>
                Status
                <select
                  required
                  value={form.status === "expired" ? "" : form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="" disabled>
                    Choose status to save changes
                  </option>
                  {["active", "inactive"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            <p>
              Dates use UTC+7. An end date expires at the start of that day. New
              vouchers are active.
            </p>
            <div className="form-actions">
              <Link to="/admin/vouchers">Cancel</Link>
              <button className="primary" disabled={saving}>
                {saving ? "Saving..." : "Save Voucher"}
              </button>
            </div>
          </form>
        )
      )}
    </section>
  );
}
