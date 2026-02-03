export default function Placeholder({ title, description }) {
  return (
    <div className="ff-card border-dashed p-6 text-sm text-ff-muted">
      <h2 className="text-lg font-semibold text-ff-text">{title}</h2>
      <p className="mt-2">{description}</p>
    </div>
  )
}