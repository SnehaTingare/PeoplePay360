export default function FormField({ label, error, hint, children, htmlFor }) {
  return <div className="form-field">
    <label htmlFor={htmlFor}>{label}</label>
    {children}
    {hint && <small className="field-hint">{hint}</small>}
    {error && <small className="field-error">{error}</small>}
  </div>
}
