import StatusBadge from '../../../shared/components/StatusBadge/StatusBadge'
import { formatDate, maskAccount, referenceLabel } from '../employeeUtils'

function Detail({ label, children }) {
  return <div className="detail-item"><dt>{label}</dt><dd>{children || '—'}</dd></div>
}

export default function EmployeeDetails({ employee, departments = [], schedules = [], managers = [], selfService = false }) {
  return <div className="employee-details-grid">
    <section className="panel detail-section"><h2>Basic information</h2><dl><Detail label="Employee ID">{employee.employeeId}</Detail><Detail label="Email">{employee.email}</Detail><Detail label="Phone">{employee.phone}</Detail><Detail label="Joining date">{formatDate(employee.joiningDate)}</Detail></dl></section>
    <section className="panel detail-section"><h2>Employment information</h2><dl><Detail label="Department">{referenceLabel(employee.department, departments)}</Detail><Detail label="Job position">{employee.jobPosition}</Detail><Detail label="Manager">{referenceLabel(employee.manager, managers, (record) => `${record.firstName} ${record.lastName}`)}</Detail><Detail label="Employee type"><span className="code-text">{employee.employeeType}</span></Detail><Detail label="Working schedule">{referenceLabel(employee.workingSchedule, schedules)}</Detail><Detail label="Status"><StatusBadge value={employee.employmentStatus} /></Detail></dl></section>
    {employee.bankDetails && <section className="panel detail-section"><h2>Bank details</h2><dl><Detail label="Account holder">{employee.bankDetails.accountHolderName}</Detail><Detail label="Account number">{maskAccount(employee.bankDetails.accountNumber)}</Detail><Detail label="Bank">{employee.bankDetails.bankName}</Detail><Detail label="IFSC code">{employee.bankDetails.ifscCode}</Detail></dl>{selfService && <p className="detail-note">Bank information is shown in masked form for your security.</p>}</section>}
  </div>
}
