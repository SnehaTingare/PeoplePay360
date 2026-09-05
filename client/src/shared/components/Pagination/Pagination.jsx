export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null
  return <nav className="pagination" aria-label="Pagination"><button className="button button--secondary button--small" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>Previous</button><span>Page {meta.page} of {meta.totalPages}</span><button className="button button--secondary button--small" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)}>Next</button></nav>
}
