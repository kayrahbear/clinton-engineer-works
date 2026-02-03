export default function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="ff-card border-rose-400/40 bg-rose-500/15 p-6 text-sm text-rose-100">
      <h2 className="text-lg font-semibold text-rose-50">{title}</h2>
      <p className="mt-2 text-rose-100/80">
        {message ?? 'Please try again or refresh the page.'}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="ff-btn-secondary mt-4 border-rose-200/40 text-rose-50 hover:border-rose-200/80"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}