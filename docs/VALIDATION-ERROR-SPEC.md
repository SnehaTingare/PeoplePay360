# PeoplePay360 — VALIDATION-ERROR-SPEC.md

## 1. Purpose

This file defines validation rules, error identifiers, severity, expected system behavior, and recommended HTTP behavior for PeoplePay360.

Use these rules consistently across frontend, backend, business logic, and tests.

---

## 2. Severity Levels

### Validation Error
User input is invalid and the requested operation must not continue.

### Blocking Payroll Error
The system cannot reliably compute or finalize payroll until the issue is resolved.

### Warning
The operation may continue, but the user should review the issue.

### Forbidden
Authenticated user lacks permission.

### Unauthorized
Authentication is missing or invalid.

---

## 3. Authentication and Authorization

| ID | Condition | Severity / HTTP | Expected Behavior |
|---|---|---|---|
| AUTH-001 | Invalid login credentials | 401 Unauthorized | Reject login. Do not reveal whether email or password was wrong. |
| AUTH-002 | Missing/invalid auth token | 401 Unauthorized | Reject protected request. |
| AUTH-003 | Role lacks permission | 403 Forbidden | Reject server-side even if frontend route is hidden. |
| AUTH-004 | User is inactive | 403 / Login denied | Do not allow login or protected actions. |
| AUTH-005 | User must change temporary password | Controlled access | Redirect/restrict until password is changed. |

---

## 4. User Validation

| ID | Condition | Severity / HTTP | Expected Behavior |
|---|---|---|---|
| USR-001 | Duplicate email | 409 / Validation | Reject user creation/update. |
| USR-002 | Invalid role | Validation | Reject. |
| USR-003 | Weak/invalid password | Validation | Reject based on chosen password policy. |
| USR-004 | Attempt to retrieve plaintext password | Forbidden by design | Existing password is never returned. |
| USR-005 | Duplicate Admin bootstrap | Validation/system guard | Do not create another bootstrap Admin automatically once one exists. |
| USR-006 | `EMPLOYEE_ACCOUNT_REQUIRES_EMPLOYEE_ONBOARDING` | 422 / Business validation | Normal EMPLOYEE User accounts must be provisioned through `POST /employees`. |

---

## 5. Employee Validation

| ID | Condition | Severity | Expected Behavior |
|---|---|---|---|
| EMP-001 | Employee email duplicates another employee where uniqueness is required | Validation | Reject. |
| EMP-002 | Employee assigned as own manager | Validation | Reject. |
| EMP-003 | Missing required department/position if configured as required | Validation | Reject. |
| EMP-004 | Employee inactive | Business rule | Keep history; exclude from normal future payroll eligibility. |
| EMP-005 | Employee user accesses another employee's private record | 403 Forbidden | Reject. |

---

## 6. Working Schedule Validation

| ID | Condition | Severity | Expected Behavior |
|---|---|---|---|
| SCH-001 | End Time <= Start Time | Validation | Reject unless overnight shifts are explicitly supported. |
| SCH-002 | Break < 0 | Validation | Reject. |
| SCH-003 | Break >= shift duration | Validation | Reject. |
| SCH-004 | Duplicate schedule line for same day/time range | Validation/warning | Reject or prevent ambiguous duplicate entry. |
| SCH-005 | No working days configured | Warning/allowed | Allow only if intentionally representing zero-hour schedule. |

---

## 7. Contract Validation

| ID | Condition | Severity | Expected Behavior |
|---|---|---|---|
| CTR-001 | Start Date > End Date | Validation | Reject. |
| CTR-002 | Two contracts overlap for same employee and payroll period | Blocking | Do not silently choose one; payroll must stop for that employee. |
| CTR-003 | No applicable contract for selected Payrun period | Blocking | Employee cannot be computed/finalized. |
| CTR-004 | Contract wage missing for wage-based rule | Blocking | Salary calculation cannot continue. |
| CTR-005 | Contract wage < 0 | Validation | Reject. |
| CTR-006 | Contract Salary Structure missing | Blocking/validation | Employee cannot be eligible for structure-based payroll. |
| CTR-007 | Contract Salary Structure does not match Payrun structure | Eligibility exclusion | Do not show employee as eligible for that Payrun. |
| CTR-008 | Contract starts after Payrun period | Eligibility exclusion | Not eligible. |
| CTR-009 | Contract ends before Payrun period | Eligibility exclusion | Not eligible. |

---

## 8. Attendance Validation

| ID | Condition | Severity | Expected Behavior |
|---|---|---|---|
| ATT-001 | Check Out without Check In | Validation | Reject. |
| ATT-002 | Check Out <= Check In | Validation | Reject. |
| ATT-003 | Employee attempts second Check In while an open attendance session exists | Validation | Reject duplicate/open check-in. |
| ATT-004 | Missing Check Out | Warning/exception | Mark as `MISSING_CHECKOUT` for HR review. |
| ATT-005 | Unauthorized user edits attendance | 403 Forbidden | Reject. |
| ATT-006 | Manual correction performed | Audit requirement | Store editor and manual-edit flag. |
| ATT-007 | Attendance duration impossible/unreasonably large | Warning/validation | Flag for HR review. Worked Hours remain `CheckOut - CheckIn`; scheduled break is not automatically subtracted. |

---

## 9. Time Off / Leave Validation

| ID | Condition | Severity | Expected Behavior |
|---|---|---|---|
| LEV-001 | Start Date > End Date | Validation | Reject. |
| LEV-002 | Allocation-required leave has no approved allocation | Validation/approval block | Cannot approve. |
| LEV-003 | Requested duration > remaining allocation | Validation/approval block | Reject request; approval must re-check balance. |
| LEV-004 | Leave overlaps another `PENDING` or `APPROVED` leave request for the same employee | Validation | Block the new overlapping request. |
| LEV-005 | Allocation validity expired | Validation | Do not use expired balance. |
| LEV-006 | Refused leave request | No balance change | Must not consume allocation. |
| LEV-007 | Approved leave request | Business action | Consume allocation if type requires allocation. |
| LEV-008 | Unauthorized user approves/refuses leave | 403 Forbidden | Reject. |
| LEV-009 | Negative allocation amount | Validation | Reject. |
| LEV-010 | Unpaid leave without allocation | Allowed if configured | May feed payroll deduction rules. |

---

## 10. Salary Structure Validation

| ID | Condition | Severity | Expected Behavior |
|---|---|---|---|
| STR-001 | Missing structure name/code | Validation | Reject. |
| STR-002 | Duplicate structure code where unique is required | Validation | Reject. |
| STR-003 | Inactive Salary Structure selected for new Payrun | Validation | Reject or hide from selection. |
| STR-004 | Structure has no active rules | Blocking | Do not compute meaningful payroll until rules exist. |

---

## 11. Salary Rule Validation

| ID | Condition | Severity | Expected Behavior |
|---|---|---|---|
| SAL-001 | Duplicate rule code within same structure | Validation | Reject. |
| SAL-002 | Rule sequence missing/invalid | Validation | Reject. |
| SAL-003 | `PERCENTAGE` or `FORMULA` rule references a missing component | Blocking | Calculation cannot continue. References may use `CONTRACT_WAGE`, `BASIC`, `GROSS`, or another previously computed component. |
| SAL-004 | Rule depends on a later sequence | Validation/blocking | Reject configuration or fail computation clearly. |
| SAL-005 | Circular dependency | Validation | Do not allow. |
| SAL-006 | Calculation type is not `FIXED`, `PERCENTAGE`, or `FORMULA` | Validation | Reject. `CONTRACT_WAGE` is an input/base value, not a calculation type. |
| SAL-007 | Arbitrary executable formula/code supplied | Security rule | Do not execute. `FORMULA` must use safe predefined/validated handling. |
| SAL-008 | Rule calculation returns invalid numeric result | Blocking | Stop employee payroll computation. |
| SAL-009 | Negative amount where not allowed | Validation | Reject according to rule category/policy. |

---

## 12. Payrun Validation

| ID | Condition | Severity | Expected Behavior |
|---|---|---|---|
| PAY-001 | Period Start > Period End | Validation | Reject. |
| PAY-002 | Salary Structure missing | Validation | Reject. |
| PAY-003 | No eligible employees | Validation | Do not create empty Payrun unless explicitly supported. |
| PAY-004 | Employee has no applicable contract | Blocking | Do not compute/finalize employee. |
| PAY-005 | Employee has multiple applicable contracts | Blocking | Do not compute/finalize employee. |
| PAY-006 | Duplicate Payslip exists for same employee/period/scope | Blocking | Prevent duplicate payroll. |
| PAY-007 | Blocking warnings/errors exist | State transition block | Payrun cannot Validate. |
| PAY-008 | Compute requested after PAID | Forbidden business action | Reject. |
| PAY-009 | Normal edit requested after PAID | Forbidden business action | Reject. |
| PAY-010 | Mark Paid requested before VALIDATED | State transition error | Reject. |
| PAY-011 | Validate requested before COMPUTED | State transition error | Reject. |
| PAY-012 | Missing bank details | Warning | Surface before finalization/payment readiness. |
| PAY-013 | Missing/exception attendance | Non-blocking Warning | Surface clearly by default. |
| PAY-014 | Payroll rule calculation failure | Blocking | Keep Payrun unvalidated. |
| PAY-015 | Employee is inactive | Eligibility exclusion | Do not include in normal future Payrun eligibility. |

---

## 13. Payslip Validation

| ID | Condition | Severity | Expected Behavior |
|---|---|---|---|
| PSL-001 | Duplicate employee Payslip for same Payrun | Blocking | Reject duplicate. |
| PSL-002 | Net Salary calculation missing | Blocking | Payslip invalid. |
| PSL-003 | Payslip missing Employee/Payrun/Period | Validation | Reject creation/finalization. |
| PSL-004 | Paid historical Payslip modification requested | Forbidden business action | Reject normal edit. |
| PSL-005 | PDF generation fails | Operational error | Payroll history remains intact; report document-generation failure. |

---

## 14. Dashboard / Reporting Validation

| ID | Condition | Severity | Expected Behavior |
|---|---|---|---|
| RPT-001 | Static/fake dashboard values | Invalid implementation | Dashboard must aggregate actual persisted data. |
| RPT-002 | Invalid date filter | Validation | Reject or normalize. |
| RPT-003 | Department/Employee Type filter references unknown value | Validation | Reject or return empty set according to API design. |

---

## 15. Recommended Payroll Warning Severity

### Blocking

- No applicable contract.
- Multiple applicable contracts.
- Duplicate Payslip.
- Missing salary-rule dependency.
- Circular/invalid rule dependency.
- Salary computation failure.
- Missing Net result.

### Non-Blocking Warning

- Missing bank details.
- Missing checkout.
- Manually edited attendance.
- Suspicious overtime/attendance exception.

---

## 16. State Transition Matrix

### Payrun

| Current State | Action | Next State | Allowed? |
|---|---|---|---|
| DRAFT | Compute | COMPUTED | Yes |
| DRAFT | Validate | — | No |
| DRAFT | Mark Paid | — | No |
| COMPUTED | Compute/Recompute | COMPUTED | Yes, if not finalized |
| COMPUTED | Validate | VALIDATED | Yes if no blocking errors |
| COMPUTED | Mark Paid | — | No |
| VALIDATED | Mark Paid | PAID | Yes |
| VALIDATED | Compute | — | Normally no |
| PAID | Compute | — | No |
| PAID | Edit normal payroll data | — | No |

### Leave Request

| Current State | Action | Next State |
|---|---|---|
| PENDING | Approve | APPROVED |
| PENDING | Refuse | REFUSED |
| APPROVED | Approve again | No-op/reject |
| REFUSED | Refuse again | No-op/reject |

---

## 17. Error Response Shape (Recommended)

Use one consistent error structure across APIs.

Example:

```json
{
  "code": "CTR-002",
  "message": "Multiple contracts are applicable for this payroll period.",
  "severity": "BLOCKING",
  "details": {
    "employeeId": "EMP001"
  }
}
```

Do not expose:
- password hashes
- internal stack traces
- database secrets
- private implementation details

---

## 18. UI Behavior for Errors

### Field Validation
Show near the input.

### Blocking Payroll Error
Show:
- employee name
- error code
- clear reason
- action required

Example:

```text
CTR-002
Rahul Sharma
Multiple contracts are valid for September 2026.
Resolve contract overlap before payroll can be validated.
```

### Warning
Show visible badge/banner without silently hiding it.

Example:

```text
PAY-012
Missing bank details
```

---

## 19. Important Consistency Rule

All frontend behavior, backend validation, tests, and reviewer explanations must use the same:
- role permissions
- Payrun statuses
- leave statuses
- contract eligibility logic
- salary-rule sequence logic
- error IDs

Do not allow one member to implement a different flow from the agreed specification.
