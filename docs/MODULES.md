# PeoplePay360 — MODULES.md

## 1. Module Map

The system is divided into independent business modules rather than technical “screens”.

```text
M01 Auth
M02 User Administration
M03 Employee Master
M04 Working Schedules
M05 Contracts
M06 Attendance
M07 Time Off
M08 Salary Configuration
M09 Payruns / Payroll Engine
M10 Payslips & Documents
M11 Notifications
M12 Reports / Payroll Dashboard
```

Each module owns its own data and exposes service/API contracts to other modules.

---

# M01 — Authentication

## Purpose
Authenticate registered users and establish identity/role context for all protected operations.

## Features
- Login
- Current user/session
- Change temporary/final password
- JWT validation
- Active-account check

## Backend services/methods
- `AuthService.login(email, password)`
- `AuthService.getCurrentUser(userId)`
- `AuthService.changePassword(userId, currentPassword, newPassword)`

## Frontend pages/components
- LoginPage
- ChangePasswordPage
- ProtectedRoute
- RoleRoute
- AuthProvider

## Models
- Uses `User` through Users module; does not own a separate auth model.

## APIs
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/change-password`

## Dependencies
- Users

## Validations
- active User
- valid credentials
- valid role
- password policy

## Edge cases
- inactive account
- invalid/expired token
- first login requires password change

## Completion checklist
- [ ] JWT auth works
- [ ] 401 vs 403 correctly separated
- [ ] inactive login denied
- [ ] protected frontend routes follow role permissions
- [ ] passwords never stored/logged in plaintext

---

# M02 — User Administration

## Purpose
Provision system login accounts and enforce frozen roles.

## Features
- Bootstrap first Admin
- Create internal/admin user
- Controlled Employee-account provisioning service contract
- Assign role
- Activate/deactivate account
- Temporary credential/invitation flow

## Backend services/methods
- `BootstrapAdminService.ensureInitialAdmin()`
- `UserService.createUser(input, actor)`
- `UserService.provisionEmployeeAccount(input)` (called by Employee onboarding only)
- `UserService.assignRole(userId, role, actor)`
- `UserService.activate(userId, actor)`
- `UserService.deactivate(userId, actor)`
- `UserService.getUser/listUsers`

## Frontend pages/components
- UsersPage
- UserForm
- RoleSelect
- UserStatusBadge
- CredentialDeliveryDialog

## Models
### User
- name
- email
- passwordHash
- role
- status: ACTIVE/INACTIVE
- employeeId?
- mustChangePassword
- timestamps

## APIs
- `/users/*`

## Dependencies
- Authentication/security utilities

## Validations
- `USR-001..006`
- only Admin can manage users/roles
- standalone User creation rejects role `EMPLOYEE`

## Edge cases
- duplicate email
- Admin bootstrapped twice
- deactivated user
- Employee provisioning cleanup after a failed onboarding attempt

## Completion checklist
- [ ] first Admin bootstraps securely
- [ ] Admin can create internal/admin role types
- [ ] duplicate email rejected
- [ ] role assignment backend-protected
- [ ] temp password/activation delivered safely

---

# M03 — Employee Master

## Purpose
Store the central HR record and provide navigation/context to all related employee data.

## Features
- List view
- Kanban view
- Employee form
- Department/manager/job/schedule/status fields
- Related counts: Contracts, Attendance, Time Off, Allocations
- Active/inactive lifecycle
- Automatic EMPLOYEE User provisioning with one-time temporary credential

## Backend services/methods
- `EmployeeService.createEmployee`
- `EmployeeService.updateEmployee`
- `EmployeeService.getEmployee`
- `EmployeeService.listEmployees`
- `EmployeeService.getRelatedCounts`
- `EmployeeService.deactivateEmployee`
- `EmployeeService.assertOwnership`
- `EmployeeService.resolveEmployeeForUser`

## Frontend pages/components
- EmployeeListPage
- EmployeeKanbanPage
- EmployeeDetailPage
- EmployeeForm
- EmployeeSmartButtons
- EmployeeFilterBar

## Models
### Employee
- employeeCode
- identity/contact fields
- department
- managerId
- jobPosition
- employeeType
- scheduleId?
- bank details
- status ACTIVE/INACTIVE
- dateOfJoining
- reciprocal User link

## APIs
- `GET /employees/me`
- `GET/POST /employees`
- `GET/PATCH /employees/:id`
- `POST /employees/:id/deactivate`

## Dependencies
- Working Schedules for schedule reference validation
- self-reference for manager
- Users service for Employee account provisioning and link/status synchronization

## Validations
- `EMP-001..005`

## Edge cases
- self-manager
- inactive employee still referenced by old Payrun/Payslip
- missing bank details (warning later, not employee creation blocker)

## Completion checklist
- [ ] list + Kanban + form supported
- [ ] related counts are live
- [ ] inactive history preserved
- [ ] own profile access is ownership-safe

---

# M04 — Working Schedules

## Purpose
Define reusable weekly work patterns and expected hours for attendance/payroll context.

## Features
- List/Form
- Day/start/end/break lines
- automatic daily/weekly-hour calculation
- assignable to Employee/Contract

## Backend services/methods
- `ScheduleService.calculateLineHours`
- `ScheduleService.calculateWeeklyHours`
- `ScheduleService.create/update/list/get`
- `ScheduleService.resolveScheduleContext(employee, contract)`

## Frontend pages/components
- WorkingScheduleListPage
- WorkingScheduleFormPage
- ScheduleLineEditor
- WeeklyHoursSummary

## Models
### WorkingSchedule
- name
- type?
- lines[]
- weeklyHours

## APIs
- `/working-schedules/*`

## Dependencies
- none for core creation

## Validations
- `SCH-001..005`

## Edge cases
- overnight shift not supported in MVP
- zero-hour schedule
- break exceeds shift
- referenced schedule deletion

## Completion checklist
- [ ] weekly hours always derived
- [ ] invalid time lines rejected
- [ ] schedule resolution precedence shared by payroll/attendance

---

# M05 — Contracts

## Purpose
Preserve historical employment terms and resolve the exact contract applicable to a payroll period.

## Features
- Contract list/form
- employee link
- date range
- wage
- department/position
- Salary Structure
- schedule
- canonical lifecycle DRAFT/RUNNING/EXPIRED/CANCELLED
- historical records

## Backend services/methods
- `ContractService.createContract`
- `ContractService.updateContract`
- `ContractService.cancelContract`
- `ContractService.findOverlaps`
- `ContractService.resolveApplicableContract(employeeId, period)`
- `ContractService.listEmployeeContracts`

## Frontend pages/components
- ContractListPage
- ContractDetailPage
- ContractForm
- ContractStatusBadge
- ContractHistorySection

## Models
### Contract
- employeeId
- startDate
- endDate?
- wage
- department
- jobPosition
- scheduleId?
- salaryStructureId
- status

## APIs
- `/contracts/*`

## Dependencies
- Employees
- Working Schedules
- Salary Configuration

## Validations
- `CTR-001..009`

## Edge cases
- no period contract
- two overlapping contracts
- future/expired contract
- salary change across history

## Completion checklist
- [ ] overlap rejected during create/update
- [ ] period resolver returns exactly one or explicit error
- [ ] old contracts never overwritten for salary revision
- [ ] Payrun uses service resolver, never “latest contract”

---

# M06 — Attendance

## Purpose
Capture actual presence/worked-time data and attendance exceptions.

## Features
- Employee Check In/Out
- worked-hour calculation
- statuses OPEN/PRESENT/LATE/OVERTIME/ABSENT/MISSING_CHECKOUT
- HR list/form
- manual correction with audit metadata

## Backend services/methods
- `AttendanceService.checkIn`
- `AttendanceService.checkOut`
- `AttendanceService.calculateWorkedHours`
- `AttendanceService.determineStatus`
- `AttendanceService.correctAttendance`
- `AttendanceService.getPeriodContext(employeeId, period)`

## Frontend pages/components
- MyAttendancePage
- CheckInOutCard
- AttendanceListPage
- AttendanceDetailForm
- AttendanceStatusBadge
- AttendanceExceptionFilter

## Models
### Attendance
- employeeId
- date
- checkIn
- checkOut?
- workedHours?
- status
- manualEdit
- editedBy?
- correctionReason?

## APIs
- `/attendance/me`
- `/attendance/check-in`
- `/attendance/check-out`
- `/attendance/*` HR routes

## Dependencies
- Employees
- Working Schedules for expected-time comparison

## Validations
- `ATT-001..007`

## Edge cases
- duplicate check-in
- checkout without check-in
- missing checkout
- manual correction
- late/overtime boundaries

## Completion checklist
- [ ] own attendance protected by ownership
- [ ] duplicate open session prevented
- [ ] manual correction auditable
- [ ] period summary consumable by Payrun/Reports

---

# M07 — Time Off

## Purpose
Manage leave policy, allocations, requests, approval/refusal and balance consumption.

## Features
### Time Off Types
- units days/hours
- allocation requirement
- approval workflow
- paid/unpaid payroll treatment

### Allocations
- DRAFT → APPROVED/CANCELLED
- allocated/consumed/remaining
- validity period

### Requests
- PENDING → APPROVED/REFUSED
- duration calculation
- balance validation

## Backend services/methods
- `TimeOffService.createType/updateType`
- `TimeOffService.createAllocation`
- `TimeOffService.approveAllocation`
- `TimeOffService.getBalance`
- `TimeOffService.createRequest`
- `TimeOffService.approveRequest`
- `TimeOffService.refuseRequest`
- `TimeOffService.getApprovedPayrollContext(employeeId, period)`

## Frontend pages/components
- TimeOffTypesPage
- AllocationsPage
- AllocationForm
- MyLeaveBalancePage
- MyTimeOffRequestsPage
- TimeOffRequestForm
- TimeOffApprovalPage
- LeaveBalanceCard

## Models
- TimeOffType
- TimeOffAllocation
- TimeOffRequest

## APIs
- `/time-off/types/*`
- `/time-off/allocations/*`
- `/time-off/requests/*`

## Dependencies
- Employees

## Validations
- `LEV-001..010`

## Edge cases
- request exceeds balance
- balance changes between request and approval
- overlap
- allocation expires
- refused request must not consume balance
- unpaid leave without allocation

## Completion checklist
- [ ] only APPROVED allocation contributes balance
- [ ] approval revalidates balance atomically/defensively
- [ ] only APPROVED request consumes balance
- [ ] canonical status is REFUSED, not REJECTED
- [ ] approved unpaid leave can be read by Payroll

---

# M08 — Salary Configuration

## Purpose
Define reusable, configurable payroll computation rules without hardcoding salary values in Payrun code.

## Features
- Salary Structure list/form
- active/inactive structure
- rule count + employee count
- Salary Rule list/form
- categories
- computation type
- sequence
- dependency validation

## Backend services/methods
- `SalaryConfigService.createStructure/updateStructure`
- `SalaryConfigService.activate/deactivateStructure`
- `SalaryConfigService.createRule/updateRule`
- `SalaryConfigService.activate/deactivateRule`
- `SalaryConfigService.getOrderedActiveRules(structureId)`
- `SalaryConfigService.validateDependencies(structureId)`

## Frontend pages/components
- SalaryStructureListPage
- SalaryStructureFormPage
- SalaryRuleListPage
- SalaryRuleFormPage
- RuleSequenceEditor
- CalculationMethodFields

## Models
### SalaryStructure
- name
- code
- description
- status ACTIVE/INACTIVE

### SalaryRule
- structureId
- name
- code
- category: BASIC/ALLOWANCE/GROSS/DEDUCTION/CONTRIBUTION/NET
- sequence
- calculationType: FIXED/PERCENTAGE/DERIVED_FORMULA
- amount?/percentage?/basedOnCode?/formulaKey?
- status ACTIVE/INACTIVE

## APIs
- `/salary-structures/*`
- `/salary-rules/*`

## Dependencies
- none for core config; employee count may query Contracts/Employees through service/report helper

## Validations
- `STR-001..004`
- `SAL-001..009`

## Edge cases
- duplicate rule code
- missing dependency
- later-sequence dependency
- circular dependency
- inactive structure used for new Payrun
- rule changes after historical payroll

## Completion checklist
- [ ] Payroll User read-only enforced
- [ ] Payroll Manager/Admin CRUD enforced
- [ ] changing rule affects future computation
- [ ] old Payslips unaffected
- [ ] contribution category supported

---

# M09 — Payruns / Payroll Engine

## Purpose
Orchestrate period-based payroll from eligible Employees to computed/validated/paid Payrun history.

## Features
- two-step creation wizard
- scope: Salary Structure + Period
- optional Employee Type eligibility filter
- eligibility + exclusion reasons
- explicit employee selection
- DRAFT/COMPUTED/VALIDATED/PAID states
- computation
- warnings
- validation
- Mark Paid
- historical preservation

## Backend services/methods
### Eligibility
- `PayrollEligibilityService.getEligibleEmployees(scope)`
- `PayrollEligibilityService.assertSelectedEmployeesEligible(scope, employeeIds)`

### Payrun orchestration
- `PayrunService.createDraft`
- `PayrunService.updateDraftSelection`
- `PayrunService.compute`
- `PayrunService.validate`
- `PayrunService.markPaid`
- `PayrunService.deleteDraft`

### Calculation
- `PayrollCalculationService.computeEmployee(employeeId, payrunContext)`
- `PayrollCalculationService.executeRule(rule, context, priorResults)`
- `PayrollCalculationService.buildWarnings`

## Frontend pages/components
- PayrunListPage
- NewPayrunWizard
- PayrunScopeStep
- EligibleEmployeeStep
- PayrunDetailPage
- PayrunSummaryCards
- PayslipSummaryTable
- PayrollWarningPanel
- PayrunActionBar

## Models
### Payrun
- name
- salaryStructureId
- periodStart
- periodEnd
- selectedEmployeeIds[]
- status
- totals/summary
- paidAt?
- paidBy?

### PayrunWarning
May be embedded or separate:
- payrunId
- employeeId/payslipId?
- code
- severity INFO/WARNING/ERROR
- message
- details

## APIs
- `POST /payruns/eligibility`
- `/payruns/*`
- `/payruns/:id/compute`
- `/payruns/:id/validate`
- `/payruns/:id/mark-paid`
- `/payruns/:id/send-payslips`

## Dependencies
- Employees
- Contracts
- Working Schedules
- Attendance
- Time Off
- Salary Configuration
- Payslips

## Validations
- `PAY-001..015`
- Contract errors
- Salary Rule errors

## Edge cases
- employee becomes inactive after eligibility but before create/compute
- contract changes after wizard step 1
- overlapping contracts
- duplicate Payslip
- repeated Compute
- blocking warnings
- missing bank details
- attempt to recompute PAID

## Completion checklist
- [ ] eligibility does not create Payrun
- [ ] selected employees revalidated at creation and computation
- [ ] computation uses applicable contract
- [ ] ordered Salary Rules drive Payslip lines
- [ ] warnings classified INFO/WARNING/ERROR
- [ ] blocking ERROR prevents Validate
- [ ] Mark Paid only after Validate
- [ ] PAID is immutable

---

# M10 — Payslips & Documents

## Purpose
Store the immutable employee-level payroll result and provide human-readable/PDF output.

## Features
- Payslip list
- Payrun-linked detail
- employee own Payslips
- calculation breakdown
- PDF generation
- historical snapshot

## Backend services/methods
- `PayslipService.upsertComputedSnapshot(payrunId, employeeId, calculation)`
- `PayslipService.getPayslip`
- `PayslipService.listPayslips`
- `PayslipService.getOwnPayslips`
- `PayslipPdfService.generateFromSnapshot(payslipId)`

## Frontend pages/components
- PayslipListPage
- MyPayslipsPage
- PayslipDetailPage
- SalaryBreakdownTable
- PayslipHeader
- PrintPayslipButton

## Models
### Payslip
- payrunId
- employeeId
- status
- period snapshot
- contract reference + wage snapshot
- structure snapshot
- workedDays/context
- lines[]
- gross
- deductions
- contributions
- net

## APIs
- `/payslips/me`
- `/payslips`
- `/payslips/:id`
- `/payslips/:id/pdf`

## Dependencies
- Payruns
- Employees

## Validations
- `PSL-001..005`
- ownership
- historical immutability

## Edge cases
- PDF generation failure
- historical rule/contract changed later
- employee attempts another employee's Payslip

## Completion checklist
- [ ] one Payslip per employee per Payrun
- [ ] full Basic/Allowance/Gross/Deduction/Contribution/Net breakdown
- [ ] PDF uses stored snapshot, not recalculation
- [ ] Employee sees own only

---

# M11 — Notifications

## Purpose
Deliver generated Payslips to employees without coupling email failure to payroll computation.

## Features
- bulk Payrun Payslip email
- per-employee delivery result
- failure summary

## Backend services/methods
- `PayslipEmailService.sendPayslip(payslipId)`
- `PayslipEmailService.sendPayrunPayslips(payrunId)`

## Frontend pages/components
- SendPayslips action on Payrun
- DeliverySummaryDialog

## Models
No model required for MVP. Optional delivery log only if time permits.

## APIs
- exposed through `POST /payruns/:id/send-payslips`

## Dependencies
- Payslips/PDF
- Employees email
- mail provider configuration

## Validations
- employee email exists
- Payslip exists
- user authorized

## Edge cases
- one email fails while others succeed
- missing email
- provider unavailable

## Completion checklist
- [ ] failure does not modify Payrun financial state
- [ ] each employee receives only own Payslip
- [ ] delivery summary returned

---

# M12 — Reports / Payroll Dashboard

## Purpose
Aggregate live HR/payroll records into the required operational Dashboard.

## Features
- filters: Period, Department, Employee Type
- KPI cards
- Salary Cost by Department
- Monthly Net Salary Trend
- Payroll statuses/warnings
- Attendance overview
- Time Off overview
- Department headcount + expenditure

## Backend services/methods
- `ReportService.getPayrollDashboard(filters, actor)`
- internal aggregation helpers for payroll, attendance, leave, departments

## Frontend pages/components
- PayrollDashboardPage
- DashboardFilters
- KPIGrid
- SalaryCostChart
- MonthlyNetSalaryChart
- AttendanceOverview
- TimeOffOverview
- PayrollWarningsTable
- DepartmentBreakdown

## Models
None. Read-only aggregation from source models.

## APIs
- `GET /reports/payroll-dashboard`

## Dependencies
- Employees
- Contracts
- Attendance
- Time Off
- Payruns
- Payslips

## Validations
- `RPT-001..003`
- role-based field visibility

## Edge cases
- no data for filter
- partially computed but unpaid Payruns
- department renamed after historical payroll
- HR Manager restricted view

## Completion checklist
- [ ] all values use persisted data
- [ ] filters recalculate server-side
- [ ] paid salary KPI uses PAID Payruns
- [ ] charts have no static arrays
- [ ] HR/Payroll visibility follows role rules

---

## 13. Module Build Order

```text
1. Auth + Users
2. Employees + Working Schedules
3. Contracts
4. Attendance
5. Time Off
6. Salary Configuration
7. Payruns / Payroll Calculation
8. Payslips / PDF
9. Notifications
10. Reports / Dashboard
11. Integration hardening + demo data
```

This order follows the dependency chain shown in the workflow PNG and the official end-to-end problem flow.
