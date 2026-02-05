export default function Modal({ title, description, isOpen, onClose, children }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative w-full max-w-lg rounded-3xl border border-ff-border bg-ff-surface/95 p-6 shadow-glowMint">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-ff-text">{title}</h3>
            {description && <p className="mt-1 text-sm text-ff-muted">{description}</p>}
          </div>
          <button className="ff-btn-secondary" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}