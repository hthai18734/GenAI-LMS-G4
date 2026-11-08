import { useState } from 'react';
import { authenticatedBlob } from '../../shared/api/client.js';
import { useToast } from '../../components/toastContext';
export default function AssignmentAttachment({ attachment, url }) {
  const [busy, setBusy] = useState(false), { addToast } = useToast();
  if (!attachment) return null;
  async function access(view) {
    const preview = view ? window.open('about:blank', '_blank') : null;
    if (preview) preview.opener = null;
    setBusy(true);
    try {
      const blob = await authenticatedBlob(url), objectUrl = URL.createObjectURL(blob);
      if (view && preview) preview.location.href = objectUrl;
      else {
        const link = document.createElement('a'); link.href = objectUrl; link.download = attachment.name; document.body.append(link); link.click(); link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (e) { preview?.close(); addToast(e.message, 'error'); }
    finally { setBusy(false); }
  }
  return <div className="assignment-attachment"><div><strong>{attachment.name}</strong><small>{Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB</small></div><div className="assessment-actions">
    {attachment.mimeType === 'application/pdf' && <button type="button" className="assessment-button" disabled={busy} onClick={() => access(true)}>View PDF</button>}
    <button type="button" className="assessment-button" disabled={busy} onClick={() => access(false)}>{busy ? 'Loading…' : 'Download'}</button>
  </div></div>;
}
