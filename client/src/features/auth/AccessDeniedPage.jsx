import { Link } from 'react-router-dom'

export default function AccessDeniedPage() {
  return <section className="center-message"><span className="error-code">403</span><h1>Access denied</h1><p>You do not have permission to view this page.</p><Link className="button" to="/">Return home</Link></section>
}
