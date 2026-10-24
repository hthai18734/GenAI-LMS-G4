import React, { useEffect, useState } from "react";
import { voucherService } from '../features/voucher/api.js';

export default function VoucherRedemptionHistory({ voucherId }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    voucherService
      .history(voucherId, page)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [voucherId, page, retry]);
  return (
    <section>
      <h2>Redemption history</h2>
      {error ? (
        <p role="alert" className="page-error">
          {error}{" "}
          <button className="ghost" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </button>
        </p>
      ) : !data ? (
        <div className="spinner" />
      ) : data.redemptions.length === 0 ? (
        <p>No redemptions yet.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Transaction</th>
                  <th>Base price</th>
                  <th>Discount</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.redemptions.map((r) => (
                  <tr key={r._id}>
                    <td>
                      {r.userId?.fullName || "Deleted user"}
                      <br />
                      {r.userId?.email}
                    </td>
                    <td>{r.transactionId || "Legacy redemption"}</td>
                    <td>{r.orderTotal ?? "Not recorded"}</td>
                    <td>{r.discountAmount ?? "Not recorded"}</td>
                    <td>{r.finalTotal ?? "Not recorded"}</td>
                    <td>
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : "Not recorded"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button
              className="ghost"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {data.page} / {data.totalPages}
            </span>
            <button
              className="ghost"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(data.page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
