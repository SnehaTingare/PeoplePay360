import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return <main className="auth-layout"><div className="auth-aside"><div><span className="auth-kicker">PeoplePay360</span><h2>One secure place for your people operations.</h2><p>Role-aware access keeps every team member focused on the work that matters.</p></div><small>HR & Payroll Management</small></div><div className="auth-content"><Outlet /></div></main>
}
