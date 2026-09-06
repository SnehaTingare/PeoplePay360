export default function LoadingState({ label = 'Loading…', fullPage = false }) {
  return <div className={`loading-state ${fullPage ? 'loading-state--page' : ''}`} role="status" aria-live="polite">
    <span className="loading-label"><span className="spinner" />{label}</span>
  </div>
}
