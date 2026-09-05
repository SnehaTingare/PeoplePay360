# PeoplePay360 — TEST-CASES.md

## 1. Purpose

This file defines the minimum test scenarios for PeoplePay360.

Tests are grouped by module and should verify:
- happy paths
- permissions
- business logic
- validation
- edge cases
- state transitions
- historical integrity

---

## 2. Authentication and User Tests

### TC-AUTH-001 — Bootstrap Admin

**Setup**
- Database contains no Admin.

**Action**
- Start/provision application.

**Expected**
- Exactly one bootstrap Admin is created from secure configuration.
- Password is stored only as hash.

---

### TC-AUTH-002 — No duplicate bootstrap Admin

**Setup**
- Admin already exists.

**Action**
- Restart application.

**Expected**
- No second bootstrap Admin is created.

---

### TC-AUTH-003 — Admin creates user

**Input**
- Name: Rahul Sharma
- Email: rahul@company.com
- Role: Employee

**Expected**
- User created.
- Temporary credential/activation process created.
- User is forced to set/change password if using temporary-password flow.

---

### TC-AUTH-004 — Duplicate user email

**Setup**
- `rahul@company.com` already exists.

**Action**
- Admin creates another user with same email.

**Expected**
- Reject with `USR-001`.

---

### TC-AUTH-005 — Employee accesses payroll API

**Setup**
- Authenticated Employee.

**Action**
- Call Salary Rule or Payrun administration endpoint.

**Expected**
- `403 Forbidden`
- `AUTH-003`

---

### TC-AUTH-006 — Inactive user login

**Setup**
- `isActive = false`.

**Action**
- Attempt login.

**Expected**
- Login denied.

---

## 3. Employee Tests

### TC-EMP-001 — Create employee

**Input**
- Valid employee details.

**Expected**
- Employee created.
- Appears in Employee List.
- Related Contract/Attendance/Time Off navigation is available.

---

### TC-EMP-002 — Self-manager assignment

**Action**
- Set Employee.Manager = same Employee.

**Expected**
- Reject with `EMP-002`.

---

### TC-EMP-003 — Inactivate employee

**Action**
- Mark employee inactive.

**Expected**
- Historical records remain.
- Employee is excluded from normal future payroll eligibility.

---

## 4. Working Schedule Tests

### TC-SCH-001 — Calculate daily hours

**Input**
- Start: 09:00
- End: 18:00
- Break: 1 hour

**Expected**

```text
Daily Expected Hours = 8
```

---

### TC-SCH-002 — Calculate weekly hours

**Input**
- Monday-Friday
- 8 hours/day

**Expected**

```text
Weekly Expected Hours = 40
```

---

### TC-SCH-003 — Invalid time range

**Input**
- Start: 18:00
- End: 09:00
- Overnight shift support disabled

**Expected**
- Reject with `SCH-001`.

---

### TC-SCH-004 — Break longer than shift

**Input**
- Start: 09:00
- End: 12:00
- Break: 4 hours

**Expected**
- Reject with `SCH-003`.

---

## 5. Contract Tests

### TC-CTR-001 — Historical contract selection

**Setup**

```text
Contract A
Jan-Jun 2026
Wage = 40,000

Contract B
Jul-Dec 2026
Wage = 50,000
```

**Action**
- Compute June Payrun.

**Expected**
- Contract A selected.
- Wage input = 40,000.

**Action**
- Compute September Payrun.

**Expected**
- Contract B selected.
- Wage input = 50,000.

---

### TC-CTR-001A — Canonical contract statuses

**Expected**
- Stored Contract status must use only:

```text
DRAFT
RUNNING
EXPIRED
CANCELLED
```

- `UPCOMING` may be derived from dates for display/filtering but is not stored as a canonical Contract status.
- Payroll still resolves the Contract applicable to the Payrun period from the historical contract/date context.

---

### TC-CTR-002 — No applicable contract

**Setup**
- Employee contract starts 01 Oct 2026.

**Action**
- Create September Payrun.

**Expected**
- Employee is not eligible or produces blocking `CTR-003`, depending on stage.
- Employee must not be finalized.

---

### TC-CTR-003 — Expired contract

**Setup**
- Contract ends 31 Aug 2026.

**Action**
- Create September Payrun.

**Expected**
- Employee not eligible.

---

### TC-CTR-004 — Overlapping contracts

**Setup**

```text
Contract A: Jan-Dec
Contract B: Jun-Dec
```

**Action**
- Compute September payroll.

**Expected**
- `CTR-002`
- Payroll for that employee is blocked.
- System does not silently choose a contract.

---

### TC-CTR-005 — Missing wage

**Setup**
- Wage-based Salary Structure.
- Applicable contract has no wage.

**Expected**
- Blocking `CTR-004`.

---

## 6. Attendance Tests

### TC-ATT-001 — Normal check-in/out

**Action**
- Check In: 09:00
- Check Out: 18:00

**Expected**
- Attendance saved.
- Worked Hours = `18:00 - 09:00 = 9 hours`.
- Scheduled Working Schedule break is not automatically subtracted from actual Attendance worked hours.

---

### TC-ATT-002 — Duplicate check-in

**Setup**
- Employee has open attendance session.

**Action**
- Check In again.

**Expected**
- Reject with `ATT-003`.

---

### TC-ATT-003 — Checkout without check-in

**Action**
- Employee attempts Check Out without active Check In.

**Expected**
- Reject with `ATT-001`.

---

### TC-ATT-004 — Checkout earlier than check-in

**Input**
- Check In: 10:00
- Check Out: 09:00

**Expected**
- Reject with `ATT-002`.

---

### TC-ATT-005 — Missing checkout

**Setup**
- Check In exists.
- No Check Out.

**Expected**
- Attendance status/exception = `MISSING_CHECKOUT`.
- Payroll/HR warning can surface according to policy.

---

### TC-ATT-006 — HR correction

**Action**
- Authorized HR edits attendance.

**Expected**
- Record updated.
- `manualEdit = true`
- `editedBy` stored.

---

### TC-ATT-007 — Unauthorized correction

**Action**
- Employee attempts HR-only attendance correction.

**Expected**
- 403 Forbidden.

---

## 7. Leave / Time Off Tests

### TC-LEV-001 — Approved allocation

**Input**

```text
Employee = Rahul
Casual Leave Allocation = 12 days
Status = Approved
```

**Expected**
- Available balance = 12.

---

### TC-LEV-002 — Approve leave request

**Setup**
- Remaining Casual Leave = 12.

**Action**
- Employee requests 2 days.
- HR approves.

**Expected**

```text
Taken = 2
Remaining = 10
Status = APPROVED
```

---

### TC-LEV-003 — Refuse leave request

**Setup**
- Remaining = 12.

**Action**
- Employee requests 2 days.
- HR refuses.

**Expected**
- Remaining stays 12.
- Status = REFUSED.

---

### TC-LEV-004 — Request exceeds balance

**Setup**
- Remaining = 2.

**Action**
- Request 4 days.

**Expected**
- Reject or block approval with `LEV-003`.

---

### TC-LEV-005 — Overlapping leave

**Setup**
- Existing leave request for the same employee is `PENDING` or `APPROVED`: 10-12 Sep.

**Action**
- Create a new request: 11-13 Sep.

**Expected**
- Block the new overlapping request.
- Return/align with `LEV-004`.

---

### TC-LEV-006 — Expired allocation

**Setup**
- Allocation validity ends 31 Aug.

**Action**
- Request September leave.

**Expected**
- Expired balance not used.
- `LEV-005`.

---

### TC-LEV-007 — Unpaid leave

**Setup**
- Time Off Type = Unpaid Leave.

**Action**
- Approve 2 days.

**Expected**
- Leave is approved.
- Payroll receives 2 unpaid leave days as input if configured.

---

## 8. Salary Structure and Rule Tests

### TC-SAL-001 — Create structure

**Input**
- Regular Salary.

**Expected**
- Structure created.
- Rules can be added and ordered.

---

### TC-SAL-002 — Rule order

**Rules**

```text
10 BASIC
20 HRA
30 TRAVEL
40 GROSS
50 PF
100 NET
```

**Expected**
- Engine evaluates ascending sequence.

---

### TC-SAL-003 — HRA percentage calculation

**Input**

```text
BASIC = 50,000
HRA calculationType = PERCENTAGE
HRA = 20% of BASIC
```

**Expected**

```text
HRA = 10,000
```

---

### TC-SAL-004 — Fixed allowance

**Input**
- `calculationType = FIXED`
- Travel = 2,000.

**Expected**
- Travel result = 2,000.

---

### TC-SAL-004A — Formula may reference Contract Wage input

**Input**

```text
CONTRACT_WAGE = 50,000
BASIC calculationType = FORMULA
BASIC formula references CONTRACT_WAGE
```

**Expected**
- BASIC = 50,000.
- `CONTRACT_WAGE` is treated as an input/base value, not a calculation type.

---

### TC-SAL-004B — Contract Wage is not a calculation type

**Action**
- Attempt to create a Salary Rule with `calculationType = CONTRACT_WAGE`.

**Expected**
- Reject with `SAL-006`.

---

### TC-SAL-005 — Duplicate rule code

**Action**
- Add second `BASIC` code within same structure.

**Expected**
- Reject with `SAL-001`.

---

### TC-SAL-006 — Missing dependency

**Setup**
- HRA = 20% of BASIC.
- BASIC rule missing.

**Expected**
- Blocking `SAL-003`.

---

### TC-SAL-007 — Dependency sequence error

**Setup**
- HRA sequence = 10.
- BASIC sequence = 20.

**Expected**
- Reject configuration or block computation with `SAL-004`.

---

### TC-SAL-008 — Circular dependency

**Setup**

```text
A depends on B
B depends on A
```

**Expected**
- Reject with `SAL-005`.

---

## 9. Payrun Creation Tests

### TC-PAY-001 — Step 1 does not create Payrun

**Action**
- Select Salary Structure + Period.
- Click Continue.

**Expected**
- Move to employee-selection step.
- Payrun is not yet persisted as final batch unless team's transient-draft design explicitly requires it.

---

### TC-PAY-002 — Eligibility: matching employee

**Setup**
- Active employee.
- One valid September contract.
- Contract Salary Structure = Regular.
- Payrun Salary Structure = Regular.

**Expected**
- Employee appears as eligible.

---

### TC-PAY-003 — Eligibility: different structure

**Setup**
- Contract Salary Structure = Intern.
- Payrun structure = Regular.

**Expected**
- Employee not eligible.

---

### TC-PAY-004 — Eligibility: future contract

**Setup**
- Contract begins October.
- Payrun = September.

**Expected**
- Employee not eligible.

---

### TC-PAY-005 — Eligibility: expired contract

**Setup**
- Contract ends August.
- Payrun = September.

**Expected**
- Employee not eligible.

---

### TC-PAY-006 — Explicit selection

**Setup**
- 5 employees eligible.

**Action**
- Payroll User selects 3.

**Expected**
- Created Payrun contains only those 3 employees.

---

### TC-PAY-007 — No eligible employees

**Expected**
- Prevent empty Payrun creation or clearly show no eligible employees.
- `PAY-003`.

---

## 10. Payrun Compute Tests

### TC-PAY-008 — Standard payroll computation

**Setup**

```text
CONTRACT_WAGE input = 50,000
BASIC = FORMULA referencing CONTRACT_WAGE
HRA = PERCENTAGE, 20% of BASIC
TRAVEL = FIXED, 2,000
GROSS = FORMULA using BASIC + allowances
PF = PERCENTAGE, 12% of BASIC
NET = FORMULA using GROSS - deductions
No unpaid leave
```

**Expected**

```text
BASIC = 50,000
HRA = 10,000
TRAVEL = 2,000
GROSS = 62,000
PF = 6,000
NET = 56,000
```

---

### TC-PAY-009 — Unpaid leave deduction

**Setup**

```text
CONTRACT_WAGE input = 50,000
Expected Working Days = 25
Approved Unpaid Leave = 2
```

**Policy**

```text
Daily Rate = 50,000 / 25 = 2,000
Unpaid Leave Deduction = 2 × 2,000 = 4,000
```

**Expected**
- Deduction = 4,000.

---

### TC-PAY-010 — Missing bank details warning

**Setup**
- Employee payroll computes correctly.
- Bank Details missing.

**Expected**
- Payslip can compute.
- `PAY-012` warning is shown.

---

### TC-PAY-011 — Duplicate Payslip

**Setup**
- Payslip already exists for same employee/Payrun scope.

**Action**
- Compute again in a way that would create duplicate.

**Expected**
- Block with `PAY-006`.

---

### TC-PAY-012 — Missing contract during compute

**Expected**
- Blocking `PAY-004`.
- Employee payroll not finalized.

---

### TC-PAY-013 — Multiple contracts during compute

**Expected**
- Blocking `PAY-005`.
- No silent contract choice.

---

### TC-PAY-014 — Salary rule failure

**Setup**
- Invalid/missing dependency.

**Expected**
- Blocking `PAY-014`.
- Payrun remains unvalidated.

---

## 11. Payrun State Tests

### TC-STATE-001 — Draft to Computed

**Setup**
- Payrun = DRAFT.

**Action**
- Compute succeeds.

**Expected**
- State = COMPUTED.

---

### TC-STATE-002 — Draft cannot Validate

**Action**
- Validate DRAFT Payrun.

**Expected**
- Reject with `PAY-011`.

---

### TC-STATE-003 — Computed with blocking errors cannot Validate

**Setup**
- Payrun = COMPUTED.
- At least one blocking payroll error.

**Action**
- Validate.

**Expected**
- Reject with `PAY-007`.

---

### TC-STATE-004 — Computed to Validated

**Setup**
- Payrun = COMPUTED.
- No blocking errors.

**Action**
- Validate.

**Expected**
- State = VALIDATED.

---

### TC-STATE-005 — Mark Paid before Validate

**Setup**
- Payrun = COMPUTED.

**Action**
- Mark Paid.

**Expected**
- Reject with `PAY-010`.

---

### TC-STATE-006 — Validated to Paid

**Setup**
- Payrun = VALIDATED.

**Action**
- Mark Paid.

**Expected**

```text
state = PAID
paidAt populated
paidBy populated
```

---

### TC-STATE-007 — Recompute Paid Payrun

**Setup**
- Payrun = PAID.

**Action**
- Compute/Recompute.

**Expected**
- Reject with `PAY-008`.

---

### TC-STATE-008 — Edit Paid Payrun

**Setup**
- Payrun = PAID.

**Action**
- Change normal payroll data.

**Expected**
- Reject with `PAY-009`.

---

## 12. Historical Integrity Tests

### TC-HIST-001 — Salary rule changes do not alter old Payslip

**Setup**
- September Payrun is PAID.
- HRA was 20%.

**Action**
- Change HRA rule to 25% for future payroll.

**Expected**
- September historical Payslip remains unchanged.
- Future computed Payruns use 25%.

---

### TC-HIST-002 — Contract change does not alter old Payslip

**Setup**
- June payroll already finalized using old contract.

**Action**
- Create new July contract with increased wage.

**Expected**
- June Payslip remains unchanged.

---

## 13. Payslip Tests

### TC-PSL-001 — Payslip component breakdown

**Expected**
Payslip contains:
- Basic
- Allowances
- Gross
- Deductions
- Net

and identifies:
- Employee
- Payrun
- Period
- Salary Structure
- Status

---

### TC-PSL-002 — PDF generation

**Action**
- Click Print/Generate Payslip.

**Expected**
- PDF generated successfully for correct employee and period.

---

### TC-PSL-003 — PDF failure

**Action**
- Simulate PDF-generation failure.

**Expected**
- Payroll data remains intact.
- User receives document-generation error.
- Payrun history is not lost.

---

## 14. Bulk Email Tests

### TC-MAIL-001 — Send Payslips

**Setup**
- Valid Payrun with employee emails.

**Action**
- Send Payslips.

**Expected**
- Each selected employee receives own Payslip only.

---

### TC-MAIL-002 — Missing employee email

**Expected**
- Delivery warning/error for that employee.
- Other employees continue according to chosen delivery policy.
- Payroll history is not corrupted.

---

## 15. Dashboard Tests

### TC-RPT-001 — Total Net Salary Paid

**Setup**
- Paid Payslips with Net:

```text
50,000
40,000
30,000
```

**Expected**

```text
Total Net Salary Paid = 120,000
```

---

### TC-RPT-002 — Payslips Generated

**Setup**
- 10 Payslips in selected filter.

**Expected**
- KPI = 10.

---

### TC-RPT-003 — Average Salary

**Setup**

```text
Total Net = 120,000
Payslips = 3
```

**Expected**

```text
Average Salary = 40,000
```

---

### TC-RPT-004 — Department filter

**Action**
- Filter Department = Engineering.

**Expected**
- All payroll/attendance/leave metrics reflect Engineering records only.

---

### TC-RPT-005 — Live dashboard data

**Action**
- Mark a new Payrun PAID.

**Expected**
- Dashboard KPI values change based on persisted data.
- No hardcoded/static chart values.

---

## 16. End-to-End Scenario 1 — Leave Lifecycle

**Setup**
- Employee Rahul.
- Casual Leave allocation = 12 days.

**Steps**
1. Rahul logs in.
2. Rahul requests 2 days Casual Leave.
3. Request status = PENDING.
4. HR Manager opens request.
5. HR approves.

**Expected**
- Status = APPROVED.
- Taken = 2.
- Remaining = 10.
- Request is visible in employee/HR history.

---

## 17. End-to-End Scenario 2 — Employee to Payslip

**Setup**
- Rahul active.
- Valid September contract.
- Wage = 50,000.
- Salary Structure = Regular.
- Valid Salary Rules.
- Attendance/leave data available.

**Steps**
1. Payroll User creates September Payrun.
2. Selects Regular Salary + September period.
3. Rahul appears in eligible employee list.
4. Payroll User selects Rahul.
5. Create Payrun.
6. Compute.
7. System resolves September contract.
8. System executes ordered Salary Rules.
9. System generates Rahul Payslip.
10. User reviews warnings.
11. Validate.
12. Mark Paid.
13. Generate Payslip PDF.

**Expected**
- Correct salary values.
- Correct Payrun state transitions.
- Historical Payslip preserved after PAID.

---

## 18. Reviewer Edge-Case Checklist

Before demo, manually verify:

- [ ] No contract
- [ ] Future contract
- [ ] Expired contract
- [ ] Overlapping contracts
- [ ] Different Salary Structure
- [ ] Duplicate Payslip
- [ ] Double check-in
- [ ] Checkout without check-in
- [ ] Missing checkout
- [ ] Leave exceeds allocation
- [ ] Refused leave does not reduce balance
- [ ] Unpaid leave reaches payroll
- [ ] Missing Salary Rule dependency
- [ ] Missing bank details warning
- [ ] Blocking error prevents Validate
- [ ] Mark Paid only after Validate
- [ ] Paid Payrun cannot recompute
- [ ] Employee payroll endpoint returns 403
- [ ] HR Manager cannot modify Salary Rules
- [ ] Payroll User has Salary Rules read-only
- [ ] Dashboard uses live data
