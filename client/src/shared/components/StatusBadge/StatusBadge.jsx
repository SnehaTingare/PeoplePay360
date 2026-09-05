export default function StatusBadge({ value, kind = 'status' }) {
  return <span className={`badge badge--${kind} badge--${String(value).toLowerCase()}`}>{value}</span>
}
