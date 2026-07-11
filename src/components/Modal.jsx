// Modal + Confirm — themed replacements for window.confirm/alert. Worksheet look:
// paper sheet, ink border, hand-drawn shadow. Never use native dialogs in the app.
export function Modal({ title, children, actions, onClose }) {
  return (
    <div className="report-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        {title && <h3 className="modal-title">{title}</h3>}
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, confirmLabel = "Delete", danger = true, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      actions={
        <>
          <button className="modal-btn" onClick={onCancel}>Cancel</button>
          <button className={`modal-btn ${danger ? "danger" : "primary"}`} onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

export function NoticeModal({ title, message, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      actions={<button className="modal-btn primary" onClick={onClose}>Okay</button>}
    >
      <p>{message}</p>
    </Modal>
  );
}
