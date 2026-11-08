export default function DiscussionPostEditor({ body, onBodyChange, onSave, onCancel, saving }) {
  return (
    <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600 }}>
        Edit your discussion post
        <textarea
          aria-label="Discussion post content"
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          required
          maxLength={5000}
          rows={3}
          style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--line)', resize: 'vertical' }}
        />
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !body.trim()}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
