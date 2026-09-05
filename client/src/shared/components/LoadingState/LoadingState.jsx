export default function LoadingState({ label = 'Loading…', fullPage = false }) {
  return <div className={`loading-state ${fullPage ? 'loading-state--page' : ''}`} role="status" aria-live="polite">
    <div className="loading-skeleton" aria-hidden="true"><span /><span /><span /></div>
    <span className="loading-label"><span className="spinner" />{label}</span>
  </div>
}
