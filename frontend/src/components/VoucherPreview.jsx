import React, { useEffect, useRef, useState } from "react";
import { voucherService } from '../features/voucher/api.js';
export default function VoucherPreview({ courseId }) {
  const [code, setCode] = useState(""),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState([]);
  const [availableError, setAvailableError] = useState("");
  const [retry, setRetry] = useState(0);
  const revision = useRef(0);
  useEffect(() => {
    setResult(null);
    setError("");
    setCode("");
    revision.current++;
    setBusy(false);
    return () => {
      revision.current++;
    };
  }, [courseId]);
  useEffect(() => {
    let cancelled = false;
    setAvailable([]);
    setAvailableError("");
    voucherService
      .available()
      .then((res) => {
        if (!cancelled) setAvailable(res.data.vouchers);
      })
      .catch((err) => {
        if (!cancelled) setAvailableError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, retry]);
  async function apply(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    const request = ++revision.current;
    try {
      const res = await voucherService.apply(courseId, code);
      if (request === revision.current) setResult(res.data);
    } catch (e) {
      if (request === revision.current) setError(e.message);
    } finally {
      if (request === revision.current) setBusy(false);
    }
  }
  return (
    <form
      className="management-card course-form"
      onSubmit={apply}
      style={{ marginBottom: 16 }}
    >
      <label>
        Voucher code
        <input
          disabled={busy}
          value={code}
          onChange={(e) => {
            revision.current++;
            setCode(e.target.value);
            setResult(null);
            setError("");
          }}
          required
        />
      </label>
      {available.length > 0 && (
        <label>
          Available vouchers
          <select
            disabled={busy}
            value=""
            onChange={(e) => {
              revision.current++;
              setCode(e.target.value);
              setResult(null);
              setError("");
            }}
          >
            <option value="">Choose a code</option>
            {available.map((v) => (
              <option key={v.voucherID} value={v.code}>
                {v.code} — {v.discountPercent}%
                {v.minOrderValue != null ? `, minimum ${v.minOrderValue}` : ""}
                {v.maxDiscountValue != null
                  ? `, maximum discount ${v.maxDiscountValue}`
                  : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      {availableError && (
        <p role="alert">
          Could not load available vouchers: {availableError}{" "}
          <button
            type="button"
            className="ghost"
            onClick={() => setRetry((n) => n + 1)}
          >
            Retry
          </button>
        </p>
      )}
      <button className="ghost" disabled={busy}>
        {busy ? "Checking..." : "Preview discount"}
      </button>
      {error && (
        <p role="alert" className="page-error">
          {error}
        </p>
      )}
      {result && (
        <div>
          <p role="status">
            Base price: {result.orderTotal} · Discount: {result.discountAmount}{" "}
            · Estimated total: {result.finalTotal}
          </p>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              revision.current++;
              setCode("");
              setResult(null);
              setError("");
            }}
          >
            Remove code
          </button>
        </div>
      )}
      <small>
        Price estimate only. Payments are not available yet; this does not
        redeem the voucher or change enrollment.
      </small>
    </form>
  );
}
