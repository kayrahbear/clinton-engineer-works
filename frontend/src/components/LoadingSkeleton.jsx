export default function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-3 w-full animate-pulse rounded-full bg-ff-surface2/70"
          style={{ width: `${90 - index * 10}%` }}
        />
      ))}
    </div>
  )
}