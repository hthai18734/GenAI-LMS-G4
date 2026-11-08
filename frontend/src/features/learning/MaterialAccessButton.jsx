import React, { useState } from 'react';
import { performMaterialAccess } from './materialAccess.js';

export default function MaterialAccessButton({
  materialId,
  filename,
  mode = 'view',
  className,
  style,
  children,
  onError,
}) {
  const [loading, setLoading] = useState(false);

  const accessMaterial = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await performMaterialAccess({ materialId, filename, mode });
    } catch (error) {
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className={className} style={style} onClick={accessMaterial} disabled={loading}>
      {loading ? 'Loading…' : children}
    </button>
  );
}
