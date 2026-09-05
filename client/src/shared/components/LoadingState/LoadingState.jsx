export default function LoadingState({ label = 'Loading…', fullPage = false }) {
  return <div className={`loading-state ${fullPage ? 'loading-state--page' : ''}`} role="status"><span className="spinner" />{label}</div>
}
