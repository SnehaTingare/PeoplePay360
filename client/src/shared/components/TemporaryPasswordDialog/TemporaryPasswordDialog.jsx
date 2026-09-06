import { useState } from 'react'
import Icon from '../Icon/Icon'

export default function TemporaryPasswordDialog({ result, title = 'User created successfully', onDone }) {
  const [copied, setCopied] = useState(false)
  if (!result) return null
  const credentials = result.accountProvisioning || result
  const email = credentials.email || result.user?.email

  const copy = async () => {
    await navigator.clipboard.writeText(credentials.temporaryPassword)
    setCopied(true)
  }

  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="password-title">
    <div className="success-mark"><Icon name="success" size={24} /></div>
    <h2 id="password-title">{title}</h2>
    <p className="muted">This temporary password is shown only once.</p>
    <dl className="credential-box"><div><dt>Email</dt><dd>{email}</dd></div><div><dt>Temporary password</dt><dd className="temporary-password">{credentials.temporaryPassword}</dd></div></dl>
    <div className="alert alert--warning">Employee created successfully. Login credentials have been sent to their registered email address</div>
    <div className="modal-actions"><button className="button button--secondary" onClick={copy}>{copied ? 'Copied' : 'Copy password'}</button><button className="button" onClick={onDone}>Done</button></div>
  </section></div>
}
