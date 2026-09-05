# `03-STATE-MACHINES.md`

## PeoplePay360 — Entity Lifecycle & State Transition Specification

**Document Type:** Functional State Specification
**Version:** 1.0
**Status:** Proposed for Team Review
**Purpose:** Freeze lifecycle statuses and valid transitions so frontend, backend, database, and AI agents use the **same state names and rules**.

> These normalized status names are our implementation standard based on the workflows in the problem statement. No developer should introduce alternatives such as `DONE`, `COMPLETED`, `ACCEPTED`, etc.

---

## 1. General Rules

* State changes must happen through **business actions**, not arbitrary frontend updates.
* Backend validates every transition.
* Invalid transitions return an error.
* Important transitions store actor and timestamp.
* Historical payroll states must be preserved.

Example:

```text
Frontend:
[Approve Leave]
      ↓
Backend action
      ↓
Validate current state
      ↓
Apply business rules
      ↓
Change state
```

---

## 2. Employee Lifecycle

Approved states:

```text
ACTIVE
INACTIVE
```

Transition:

```text
ACTIVE
  ↓
INACTIVE
```

An inactive employee:

* remains in historical records,
* keeps previous contracts/payslips,
* should not normally appear as eligible for new payroll.

Prefer **deactivation instead of deletion**.

---

## 3. User Account Lifecycle

```text
ACTIVE
INACTIVE
```

Rules:

```text
ACTIVE
→ login allowed

INACTIVE
→ login denied
```

Only Admin manages account activation/deactivation.

---

## 4. Contract Lifecycle

Approved states:

```text
DRAFT
RUNNING
EXPIRED
CANCELLED
```

Normal flow:

```text
DRAFT
  ↓
RUNNING
  ↓
EXPIRED
```

Alternative:

```text
DRAFT ─────→ CANCELLED

RUNNING ───→ CANCELLED
```

### Rules

`RUNNING` means the contract is active/applicable according to its dates.

Before moving a contract to `RUNNING`:

```text
check employee
+
check dates
+
check overlapping applicable contract
```

Multiple historical contracts must remain available, while payroll uses the contract applicable to its selected period. 

---

## 5. Attendance Lifecycle

Approved states:

```text
OPEN
PRESENT
LATE
OVERTIME
MISSING_CHECKOUT
ABSENT
```

Typical flow:

```text
Check In
   ↓
 OPEN
   ↓
Check Out
   ↓
Worked Hours Calculated
   ↓
PRESENT / LATE / OVERTIME
```

Exception:

```text
OPEN
 ↓
No checkout recorded
 ↓
MISSING_CHECKOUT
```

`ABSENT` may be created/derived for expected working days without valid attendance.

Authorized HR users may correct attendance and cause status recalculation. Attendance must capture check-in, check-out, worked hours and exceptions. 

---

## 6. Time Off Allocation Lifecycle

Approved states:

```text
DRAFT
APPROVED
CANCELLED
```

Flow:

```text
DRAFT
  ↓
APPROVED
```

Alternative:

```text
DRAFT ───→ CANCELLED
```

Only an `APPROVED` allocation contributes to available leave balance.

Derived values:

```text
allocated
consumed
remaining = allocated - consumed
```

The source requires allocations to be approved before becoming available and to track taken/remaining amounts. 

---

## 7. Time Off Request Lifecycle

Approved states:

```text
PENDING
APPROVED
REFUSED
```

State machine:

```text
             ┌→ APPROVED
PENDING ─────┤
             └→ REFUSED
```

### PENDING → APPROVED

Before transition:

```text
request still pending
+
employee valid
+
time-off type valid
+
if allocation required:
remaining balance >= requested duration
```

On success:

```text
status = APPROVED
allocation consumed
approver recorded
timestamp recorded
```

Approved requests must consume the associated leave allocation. 

### PENDING → REFUSED

```text
status = REFUSED
allocation unchanged
```

### Invalid transitions

Do not allow:

```text
APPROVED → PENDING
REFUSED → APPROVED
APPROVED → REFUSED
```

for the hackathon MVP.

---

## 8. Salary Structure Lifecycle

Approved states:

```text
ACTIVE
INACTIVE
```

Rules:

* `ACTIVE` structures can be selected for payroll.
* `INACTIVE` structures remain available historically.
* Do not physically delete a structure already referenced by payroll history.

---

## 9. Salary Rule Lifecycle

Approved states:

```text
ACTIVE
INACTIVE
```

Only `ACTIVE` rules participate in new calculations.

Rules execute according to their configured sequence. 

Historical Payslips retain calculation snapshots even if a rule is later modified/deactivated.

---

## 10. Payrun Lifecycle

This is the **most important state machine**.

Approved states:

```text
DRAFT
COMPUTED
VALIDATED
PAID
```

Main flow:

```text
DRAFT
  │
  │ Compute
  ↓
COMPUTED
  │
  │ Validate
  ↓
VALIDATED
  │
  │ Mark Paid
  ↓
PAID
```

The source explicitly provides Payrun processing actions such as Compute, Validate and Mark Paid. 

---

### PAYRUN: DRAFT

Allowed:

```text
Edit employee selection
Compute payroll
Delete/cancel draft if needed
```

Not allowed:

```text
Validate directly
Mark Paid
Send finalized Payslips
```

---

### DRAFT → COMPUTED

Triggered by:

```text
Compute
```

System performs:

```text
selected employees
      ↓
resolve contracts
      ↓
load salary rules
      ↓
execute calculations
      ↓
generate payslips
      ↓
generate warnings
```

Payslips must use the period-applicable contract and selected Salary Structure. 

---

### COMPUTED → VALIDATED

Triggered by:

```text
Validate
```

Allowed only when:

```text
no blocking payroll errors
```

Examples of blocking problems:

```text
No applicable contract
Invalid salary calculation
Duplicate finalized Payslip
Missing essential payroll configuration
```

---

### VALIDATED → PAID

Triggered by:

```text
Mark Paid
```

Important:

> `PAID` means the system records payroll as paid. It does **not** mean PeoplePay360 transfers money through a banking/payment gateway.

---

## 11. Payrun Immutability

Once:

```text
Payrun = PAID
```

do not allow:

```text
recompute
change employees
change salary structure
change period
change calculated totals
delete historical Payrun
```

This preserves payroll history, which the source explicitly requires for finalized/paid batches. 

---

## 12. Payslip Lifecycle

Use:

```text
DRAFT
COMPUTED
VALIDATED
PAID
```

Payslip normally follows its parent Payrun.

```text
Payrun DRAFT
     ↓
Payslip DRAFT

Payrun COMPUTED
     ↓
Payslip COMPUTED

Payrun VALIDATED
     ↓
Payslip VALIDATED

Payrun PAID
     ↓
Payslip PAID
```

Do not let the frontend independently set Payslip state.

---

## 13. Payslip Snapshot Rule

When computed, store the values actually used:

```text
contract wage
salary structure
salary rule results
worked days
allowances
deductions
gross
net
```

If configuration later changes:

```text
Old Payslip DOES NOT change.
```

This supports the required historical payroll behavior. 

---

## 14. Payroll Warning Severity

Warnings themselves should use:

```text
INFO
WARNING
ERROR
```

### INFO

Informational only.

Example:

```text
Employee has overtime hours.
```

### WARNING

Needs attention but may not necessarily block payroll.

Example:

```text
Missing bank details.
```

### ERROR

Blocks validation.

Example:

```text
NO_ACTIVE_CONTRACT

MULTIPLE_APPLICABLE_CONTRACTS

DUPLICATE_PAYSLIP

SALARY_COMPUTATION_FAILED
```

The exact warning catalogue will be owned by Member 2 in `VALIDATION-ERROR-SPEC.md`.

---

## 15. Transition Responsibility

| Entity        | Transition              | Who initiates     |
| ------------- | ----------------------- | ----------------- |
| Employee      | Active → Inactive       | HR/Admin          |
| Contract      | Draft → Running         | HR                |
| Contract      | Running → Expired       | System/HR         |
| Attendance    | Open → Completed Status | Employee/System   |
| Allocation    | Draft → Approved        | HR                |
| Leave Request | Pending → Approved      | HR                |
| Leave Request | Pending → Refused       | HR                |
| Payrun        | Draft → Computed        | Payroll User+     |
| Payrun        | Computed → Validated    | Payroll User+     |
| Payrun        | Validated → Paid        | Payroll User+     |
| Payslip       | lifecycle transitions   | System via Payrun |

---

## 16. Forbidden State Manipulation

Frontend must **never send arbitrary status updates** such as:

```text
PATCH /payrun
{
   status: "PAID"
}
```

Instead use business actions:

```text
POST /payruns/:id/compute

POST /payruns/:id/validate

POST /payruns/:id/mark-paid
```

Similarly:

```text
POST /time-off/requests/:id/approve
POST /time-off/requests/:id/refuse
```

This ensures that state transitions always execute required business logic.

---

## 17. Canonical Status Names

Everyone must use these exact values:

```text
EMPLOYEE
ACTIVE
INACTIVE


USER
ACTIVE
INACTIVE


CONTRACT
DRAFT
RUNNING
EXPIRED
CANCELLED


ATTENDANCE
OPEN
PRESENT
LATE
OVERTIME
ABSENT
MISSING_CHECKOUT


ALLOCATION
DRAFT
APPROVED
CANCELLED


TIME_OFF_REQUEST
PENDING
APPROVED
REFUSED


SALARY_STRUCTURE
ACTIVE
INACTIVE


SALARY_RULE
ACTIVE
INACTIVE


PAYRUN
DRAFT
COMPUTED
VALIDATED
PAID


PAYSLIP
DRAFT
COMPUTED
VALIDATED
PAID
```

No teammate or AI agent should create alternative spellings/statuses without changing this specification first.

