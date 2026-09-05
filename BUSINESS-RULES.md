# PeoplePay360 — BUSINESS-RULES.md

## 1. Purpose

This file defines the business rules for the PeoplePay360 HR & Payroll hackathon solution.

The system is a connected operational flow:

**Admin → HR Manager → Employee → Payroll Manager → Payroll User → Payslip → Dashboard**

The main principle is:

> Payroll must be driven by actual Employee, Contract, Working Schedule, Attendance, Time Off, Salary Structure, and Salary Rule records. Do not hardcode salary outputs or dashboard values.

---

## 2. Roles and Permissions

### 2.1 Employee

Can:
- View own employee details.
- View own attendance records.
- Check in and check out.
- View own leave balances.
- Create Time Off Requests.
- View/download own Payslips.

Cannot:
- View or modify other employees.
- Approve leave.
- Edit contracts.
- Configure salary structures/rules.
- Create or process Payruns.
- Administer users or roles.

---

### 2.2 HR Manager

Can:
- CRUD Employees.
- CRUD Contracts.
- CRUD Working Schedules.
- CRUD Attendance.
- CRUD Time Off Types.
- CRUD Time Off Allocations.
- Approve/refuse Time Off Requests.
- Correct attendance records where authorized.

Cannot:
- Create or process Payruns.
- Edit Salary Structures or Salary Rules.

---

### 2.3 HR Payroll User

Has all HR Manager permissions, plus:
- Create, Read, Update Payruns.
- Create, Read, Update Payslips.
- Compute payroll.
- Review warnings.
- Validate Payruns.
- Mark Payruns Paid.
- Send Payslips.

Salary Structures and Salary Rules:
- Read-only.

---

### 2.4 HR Payroll Manager

Has all HR Payroll User permissions, plus:
- Full CRUD on Salary Structures.
- Full CRUD on Salary Rules.
- Full CRUD on Payruns and Payslips.
- Full HR + payroll configuration control.

---

### 2.5 Admin

Can:
- Access all modules.
- Create and manage users.
- Assign roles.
- Activate/deactivate users.
- Manage permissions.
- Perform complete system administration.

---

## 3. Initial Admin and User Provisioning

### 3.1 Bootstrap Admin

The first Admin must be provisioned securely during initial deployment.

Recommended flow:

1. On application startup, check whether an Admin exists.
2. If no Admin exists, create one from secure environment/configuration values.
3. Store only a password hash.
4. Do not expose public Admin registration.
5. Optionally force first-login password change.

### 3.2 Creating Normal Users

Admin creates:
- Name
- Email
- Role
- Active status
- Optional linked Employee

The system should:
1. Generate a temporary password or activation token.
2. Store only the hash/token.
3. Send credentials by email or show the temporary password only once.
4. Force password change on first login.

### 3.3 Password Rules

- Never store plaintext passwords.
- Never reveal an existing user password.
- Forgot-password should reset credentials instead of showing the current password.
- Inactive users cannot authenticate.

---

## 4. Employee Management Rules

Employee is the central HR record.

Recommended fields:
- Employee ID
- Name
- Email
- Phone
- Department
- Job Position
- Manager
- Employee Type
- Working Schedule
- Active Status
- Date of Joining
- Bank Details

Rules:
- Employee email should be unique.
- Employee cannot be assigned as their own manager.
- Inactive employees remain available for history.
- Inactive employees should normally be excluded from future Payruns.

---

## 5. Working Schedule Rules

A Working Schedule defines the expected weekly work pattern.

Each schedule line contains:
- Day
- Start Time
- End Time
- Break

### 5.1 Daily Expected Hours

```text
Daily Expected Hours
= End Time - Start Time - Break
```

Example:

```text
09:00 - 18:00
Break = 1 hour

Daily Expected Hours = 8 hours
```

### 5.2 Weekly Expected Hours

```text
Weekly Expected Hours
= Sum of Daily Expected Hours
```

Example:

```text
Mon-Fri = 8 hours/day

Weekly Hours = 40 hours
```

### 5.3 Validation Rules

- End Time must be after Start Time unless overnight shifts are explicitly supported.
- Break cannot be negative.
- Break must be shorter than the shift duration.
- Days with no schedule entry are non-working days.

---

## 6. Contract Rules

An Employee may have multiple contracts over time.

Each Contract should contain:
- Employee
- Start Date
- End Date
- Wage
- Department
- Job Position
- Working Schedule
- Salary Structure
- Status/derived state

### 6.1 Why Contracts Matter

Contracts preserve historical employment terms.

Example:

```text
Contract 1
Jan-Jun 2026
Wage = 40,000

Contract 2
Jul-Dec 2026
Wage = 50,000
```

June payroll must use 40,000.
September payroll must use 50,000.

### 6.2 Applicable Contract Rule

A contract overlaps the Payrun period when:

```text
contract.startDate <= payrun.endDate
AND
(
  contract.endDate is empty
  OR
  contract.endDate >= payrun.startDate
)
```

For payroll computation, exactly one applicable contract should exist.

### 6.3 Contract Rules

- Historical contracts must not be overwritten.
- Contract Start Date must be before or equal to End Date.
- Wage must be non-negative.
- Wage is required for wage-based salary rules.
- Contract should reference a Salary Structure.
- Concurrent/overlapping applicable contracts are a blocking payroll condition.

### 6.4 Contract Statuses

Canonical stored statuses:

```text
DRAFT
RUNNING
EXPIRED
CANCELLED
```

`UPCOMING` may be derived from contract dates for display/filtering if useful, but it is not a canonical stored status.

Payroll must still resolve the Contract applicable to the selected Payrun period using the contract date range and historical contract records.

---

## 7. Attendance Rules

Attendance contains:
- Employee
- Date
- Check In
- Check Out
- Worked Hours
- Status
- Manual Edit flag
- Edited By

### 7.1 Check-In

- Employee can create an attendance entry.
- Prevent multiple open attendance sessions for the same employee.

### 7.2 Check-Out

- Check Out requires an existing Check In.
- Check Out must be later than Check In.

### 7.3 Worked Hours

```text
Worked Hours
= Check Out - Check In
```

Scheduled Working Schedule breaks are **not automatically subtracted** from actual Attendance worked hours.

Working Schedule expected hours remain:

```text
Expected Hours
= End Time - Start Time - Break
```

### 7.4 Attendance Statuses

Canonical statuses:

```text
OPEN
PRESENT
LATE
OVERTIME
ABSENT
MISSING_CHECKOUT
```

### 7.5 Manual Corrections

- Only authorized HR users can correct attendance.
- Manual edits should record who made the correction.
- Missing Check Out remains an exception until corrected.

---

## 8. Time Off / Leave Rules

Time Off is divided into:
1. Time Off Type
2. Allocation
3. Request

---

## 8.1 Time Off Type

Contains:
- Name
- Unit: Days / Hours
- Requires Allocation
- Approval Required
- Paid / Unpaid
- Payroll Integration behavior

Examples:
- Casual Leave
- Sick Leave
- Paid Leave
- Unpaid Leave

---

## 8.2 Allocation

Contains:
- Employee
- Time Off Type
- Allocated Amount
- Taken Amount
- Remaining Amount
- Validity Period
- Approval Status

Rules:
- Only approved allocations create usable balance.
- Remaining balance is based on approved consumption.

```text
Remaining
= Approved Allocation - Approved Consumed Leave
```

Example:

```text
Allocated = 12
Approved Leave = 2
Remaining = 10
```

---

## 8.3 Time Off Request

Contains:
- Employee
- Type
- Start Date
- End Date
- Duration
- Reason
- Status

Statuses:

```text
PENDING
APPROVED
REFUSED
```

Rules:
- Only approved requests consume allocation.
- Refused requests do not consume balance.
- For allocation-required leave, approval must fail if duration exceeds remaining balance.
- A new leave request must be blocked if it overlaps an existing `PENDING` or `APPROVED` leave request for the same employee.
- Unpaid Leave may be allowed without allocation.
- Unpaid Leave can feed payroll deduction calculations.

---

## 9. Salary Structure Rules

A Salary Structure is a reusable container of Salary Rules.

Examples:
- Regular Salary
- Intern Salary

A structure can contain:

```text
BASIC
HRA
TRAVEL
GROSS
PF
UNPAID_LEAVE
NET
```

Rules:
- Structure must have a unique name/code according to team policy.
- Only active rules participate in computation.
- Payrun's selected Salary Structure determines which rules are applied.

---

## 10. Salary Rule Rules

Each Salary Rule contains:
- Name
- Code
- Category
- Sequence
- Calculation Type
- Value
- Based On
- Active status

### 10.1 Categories

Recommended:

```text
Basic
Allowance
Gross
Deduction
Net
```

### 10.2 Calculation Types

Supported calculation types:

```text
FIXED
PERCENTAGE
FORMULA
```

`CONTRACT_WAGE` is an input/base value available to rule evaluation; it is **not** a calculation type.

`PERCENTAGE` and `FORMULA` rules may reference:
- `CONTRACT_WAGE`
- `BASIC`
- `GROSS`
- another previously computed component

`FORMULA` handling must use safe predefined/validated expressions. Do not execute arbitrary user-provided code.

### 10.3 Sequence Rule

Rules execute in ascending sequence.

Example:

```text
10 BASIC
20 HRA
30 TRAVEL
40 GROSS
50 PF
60 UNPAID_LEAVE
100 NET
```

Dependencies must exist before dependent rules run.

Example:

```text
HRA = 20% of BASIC
```

Therefore BASIC must run before HRA.

### 10.4 Rule Validation

- Rule code must be unique within a Salary Structure.
- Percentage rule must reference an existing prior component.
- Circular dependencies are not allowed.
- Calculation failure is a blocking payroll condition.

---

## 11. Payrun Rules

A Payrun is a payroll batch for:
- One selected Salary Structure
- One payroll period
- Explicitly selected eligible employees

### 11.1 Payrun Creation Wizard

#### Step 1 — Scope

User selects:
- Salary Structure
- Period Start
- Period End

Clicking Continue should move to employee selection without yet creating the Payrun.

#### Step 2 — Eligible Employees

Recommended eligibility:

```text
Employee is Active
AND
exactly one Contract overlaps the Payrun period
AND
Contract Salary Structure matches selected Payrun Salary Structure
AND
no duplicate Payslip already exists for the same payroll scope/period
```

### 11.2 Eligibility vs Selection

```text
Eligible = system says employee CAN be processed
Selected = Payroll User says employee WILL be included in this batch
```

The Payrun should contain only selected employees.

---

## 12. Payrun States

Recommended state machine:

```text
DRAFT
  ↓ Compute
COMPUTED
  ↓ Validate
VALIDATED
  ↓ Mark Paid
PAID
```

### DRAFT

- Payrun exists.
- Employee selection is known.
- Salary has not been finalized.

### COMPUTED

- Payslips have been generated.
- Warnings/errors are available.
- Data may be fixed and recomputed.

### VALIDATED

- Payroll result has been reviewed and accepted.
- Normal editing should be restricted.

### PAID

- External salary payment is considered completed.
- `paidAt` and `paidBy` should be stored.
- Payrun becomes historical/read-only in the normal workflow.
- Recompute should not be allowed.

---

## 13. Payroll Computation Flow

For every selected employee:

1. Load Employee.
2. Find the one applicable Contract for the Payrun period.
3. Validate no contract ambiguity.
4. Read Contract Wage.
5. Confirm matching Salary Structure.
6. Load Salary Rules ordered by Sequence.
7. Read Working Schedule.
8. Read Attendance for the Payrun period.
9. Read approved Time Off.
10. Determine worked-time / unpaid leave inputs.
11. Execute Salary Rules.
12. Save Payslip lines.
13. Calculate Gross.
14. Calculate Total Deductions.
15. Calculate Net.
16. Generate payroll warnings/errors.

---

## 14. Explainable Payroll Example

Assume:

```text
Contract Wage = 50,000
Expected Working Days = 25
Approved Unpaid Leave = 2 days
```

Rules:

```text
BASIC = FORMULA referencing CONTRACT_WAGE
HRA = PERCENTAGE of BASIC
TRAVEL = FIXED 2,000
GROSS = FORMULA using BASIC + Allowances
PF = PERCENTAGE of BASIC
UNPAID_LEAVE = FORMULA using Daily Rate × Unpaid Leave Days
NET = FORMULA using GROSS - Deductions
```

Calculation:

```text
BASIC = 50,000

HRA = 20% × 50,000
    = 10,000

TRAVEL = 2,000

GROSS
= 50,000 + 10,000 + 2,000
= 62,000

PF
= 12% × 50,000
= 6,000
```

Recommended demo Daily Rate policy:

```text
Daily Rate
= Contract Monthly Wage / Expected Working Days
= 50,000 / 25
= 2,000
```

Unpaid leave deduction:

```text
2 × 2,000 = 4,000
```

Net:

```text
NET
= 62,000 - 6,000 - 4,000
= 52,000
```

Important:

> The exact Daily Rate formula is a documented hackathon policy, not claimed as a universal statutory payroll formula.

---

## 15. Payroll Warning Rules

### 15.1 Blocking Errors

Examples:
- No applicable contract.
- Multiple applicable contracts.
- Duplicate Payslip.
- Missing salary rule dependency.
- Salary calculation failure.

Behavior:
- Employee payroll cannot be finalized.
- Payrun cannot Validate while blocking errors remain.

### 15.2 Non-Blocking Warnings

Examples:
- Missing bank details.
- Missing checkout.
- Manually edited attendance.

Behavior:
- Computation may continue.
- Warning remains visible for review.
- Whether it blocks Mark Paid can be chosen as team policy.

---

## 16. Payslip Rules

A Payslip belongs to:
- One Employee
- One Payrun
- One payroll period

It should display:
- Employee
- Salary Structure
- Payrun
- Period
- Status
- Worked Days / payroll context
- Earnings
- Allowances
- Gross
- Deductions
- Net

Paid/final historical Payslips should not change when future salary rules are modified.

---

## 17. Payment Status Rule

`Mark Paid` does not perform a real bank transfer.

It records that the external payment process is complete.

Recommended fields:

```text
status = PAID
paidAt
paidBy
```

Real bank/payout API integration is outside the core hackathon scope.

---

## 18. Payslip PDF and Email Rules

- Individual Payslip must be printable/generatable as PDF.
- Parent Payrun should support bulk Payslip delivery.
- Email failures should not corrupt payroll calculation/history.
- Delivery status may be tracked separately if time permits.

---

## 19. Dashboard Rules

Dashboard must use live stored records, not static values.

Recommended calculations:

### Total Net Salary Paid

```text
SUM(Payslip.net)
WHERE Payrun.status = PAID
```

### Payslips Generated

```text
COUNT(Payslips)
```

### Average Salary

```text
SUM(Net Salary) / Payslip Count
```

### Department Salary Cost

Group Payslip salary totals by Employee Department.

### Attendance Health

Derived from actual attendance statuses/coverage.

### Approved Time Off

Count or sum approved Time Off within selected filters.

Supported filters:
- Period
- Department
- Employee Type

---

## 20. Historical Integrity Rules

- Historical Contracts remain stored.
- Validated/Paid Payruns should not be recomputed through the normal workflow.
- Future Salary Rule changes affect future computations only.
- Old Payslips remain unchanged.
- Historical payroll data must remain auditable.

---

## 21. Build Order

### Phase 1 — Foundation
- Backend/frontend setup
- Database
- Authentication
- RBAC
- Bootstrap Admin
- Common error handling

### Phase 2 — Master Data
- Working Schedules
- Employees
- Contracts

### Phase 3 — HR Operations
- Attendance
- Time Off Types
- Allocations
- Requests
- Approval/refusal

### Phase 4 — Payroll Configuration
- Salary Structures
- Salary Rules
- Rule sequencing/dependency validation

### Phase 5 — Payroll Engine
- Payrun wizard
- Eligibility filtering
- Explicit employee selection
- Compute
- Payslips
- Warnings
- Validate
- Mark Paid

### Phase 6 — Delivery
- Payslip PDF
- Bulk email

### Phase 7 — Reporting
- Live dashboard
- Filters
- Trends
- Operational alerts

### Phase 8 — Demo Hardening
- Representative seed data
- Edge-case testing
- Error/loading states
- Stable end-to-end reviewer demo

---

## 22. Scope Boundaries

### Must Build
- Auth/RBAC
- Employees
- Schedules
- Contracts
- Attendance
- Time Off
- Salary Structures
- Salary Rules
- Payruns
- Payslips
- Payslip PDF generation
- Bulk Payslip email delivery
- Live Payroll Dashboard
- Core validations

### Should Build
- Attendance exceptions

### Can Simplify
- Email provider
- Advanced formulas
- Advanced charts
- Attendance policy complexity

### Do Not Build for 20-Hour MVP
- Real banking/payment gateway
- Full Indian statutory payroll engine
- Recruitment/ATS
- Performance Management
- Microservices/Kubernetes
- AI chatbot before core payroll works
