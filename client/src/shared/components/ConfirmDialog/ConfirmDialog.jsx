export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) {
  if (!open) return null
  return <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.stopPropagation()}>
    <h2 id="confirm-title">{title}</h2><p>{message}</p><div className="modal-actions"><button className="button button--secondary" onClick={onCancel} disabled={busy}>Cancel</button><button className={`button ${danger ? 'button--danger' : ''}`} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button></div>
  </section></div>
}
