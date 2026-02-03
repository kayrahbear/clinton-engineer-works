export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ff-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ff-border border-t-ff-mint" />
      <span>{label}</span>
    </div>
  )
}