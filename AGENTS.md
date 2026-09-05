# AGENTS.md — PeoplePay360

PeoplePay360 is a **24-hour hackathon MERN project**. Optimize for safe, fast implementation.

## 1. Stack / Architecture

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- JavaScript only
- Modular monolith
- REST base: `/api/v1`
- Business logic belongs in services, not controllers/frontend.

Backend flow:

```text
Route → Middleware → Controller → Service → Model / exported module service
```

Do not introduce microservices, Redis, Kubernetes, Python backend, TypeScript, or unrelated architecture changes.

---

## 2. Documentation Policy — IMPORTANT

For normal Codex tasks:

1. Read this `AGENTS.md`.
2. Read the current user/task prompt.
3. Inspect only the source files relevant to that task.
4. **Do NOT automatically read every file in `/docs`.**
5. Read a `/docs` file only when:
   - the prompt explicitly asks for it, or
   - a genuine unresolved business-rule ambiguity blocks implementation.

The task prompt is expected to already contain the relevant requirements.

Do not repeatedly re-audit documentation already summarized in this file.

`docs/DATABASE-SPEC.md` is not required. Do not recreate it unless explicitly asked.

---

## 3. Canonical Values

### Roles

```text
EMPLOYEE
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### Employee / User

```text
ACTIVE
INACTIVE
```

### Contract

```text
DRAFT
RUNNING
EXPIRED
CANCELLED
```

Never replace `RUNNING` with `ACTIVE`.

### Attendance

```text
OPEN
PRESENT
LATE
OVERTIME
ABSENT
MISSING_CHECKOUT
```

### Leave Allocation

```text
DRAFT
APPROVED
CANCELLED
```

### Leave Request

```text
PENDING
APPROVED
REFUSED
```

Never use `REJECTED`.

### Payrun / Payslip

```text
DRAFT → COMPUTED → VALIDATED → PAID
```

### Salary Rule

Calculation types:

```text
FIXED
PERCENTAGE
FORMULA
```

Categories:

```text
BASIC
ALLOWANCE
GROSS
DEDUCTION
NET
```

`CONTRACT_WAGE` is an input/base, not a calculation type.

Never use `DERIVED_FORMULA`, `CONTRIBUTION`, `eval`, `Function(...)`, or executable user code.

---

## 4. Core Business Rules

### Contracts
- Preserve historical Contracts.
- Payroll uses date-based applicability.
- Exactly one applicable Contract is required.
- Zero or multiple applicable Contracts are blocking.
- Never silently choose one when multiple match.

Applicable when:

```text
startDate <= payrun.periodEnd
AND
(endDate is null OR endDate >= payrun.periodStart)
```

### Working Schedule
- Expected hours = end time - start time - scheduled break.
- Weekly hours are backend-derived.

### Attendance
- Actual worked time = checkout - checkin.
- Do not subtract scheduled break from actual punch duration.
- Prevent second open check-in.
- Missing checkout is a non-blocking payroll warning by default.

### Leave
- Only APPROVED allocations provide usable balance.
- Approval consumes balance exactly once.
- REFUSED leave consumes nothing.
- Block overlap with PENDING/APPROVED requests.
- Re-check balance during approval.

### Payrun
- Step 1 eligibility preview must NOT persist a Payrun.
- Step 2 creates DRAFT only after explicit employee selection.
- Compute is idempotent before validation.
- Blocking errors prevent Validate.
- `PAID` is immutable.
- Mark Paid records state only; no real bank/payment integration.

### Payslip
- Generated only by Payrun computation.
- Preserve historical snapshots.
- Later Contract/Salary Rule changes must not alter finalized Payslips.

---

## 5. Parallel Ownership

### Group A — Platform + HR Core

```text
auth
users
departments
schedules
employees
contracts
```

### Group B — HR Ops + Payroll

```text
attendance
timeOff
salaryConfig
payruns
payslips
notifications
reports/dashboard
```

Do not duplicate another group's models/services.

Avoid editing files owned by the other group unless the task explicitly requires integration.

---

## 6. Codex Scope Rules

For every task:

- Inspect existing code first.
- Change only the requested module.
- Preserve working behavior unless the prompt explicitly changes it.
- Do not rewrite a working module wholesale for a small fix.
- Do not refactor unrelated files.
- Do not modify frontend during backend-only tasks.
- Do not modify backend during frontend-only tasks.
- Reuse existing utilities/services.
- Keep cross-module access through exported services.
- Do not invent endpoints, roles, statuses, calculations, or error IDs.
- If a genuinely new unresolved conflict blocks implementation, stop and report it.

Known resolved conflicts should NOT stop work:

```text
DERIVED_FORMULA → FORMULA
CONTRIBUTION → not canonical
REJECTED → REFUSED
Contract ACTIVE → RUNNING
missing DATABASE-SPEC.md → ignore
```

---

## 7. Testing Policy — SAVE TIME/CREDITS

Do **not** run the complete test suite after every small task.

### Tiny change
- syntax check changed JS files
- run directly related test file only if useful

### Feature/module change
- run module-specific tests only

### Full test suite
Run only:
- after a major module is finished,
- before merging branches,
- before deployment/final demo,
- after shared/core changes that may affect many modules,
- or when explicitly requested.

Do not repeatedly rerun unrelated tests.

---

## 8. Git / PR Policy

Do not automatically:

```text
commit
push
create PR
run GitHub CLI
```

unless explicitly requested.

Never spend task time fixing GitHub authentication unless the user asked for Git operations.

---

## 9. Current Priority

```text
Auth/RBAC
→ Employee
→ Contract
→ Salary Structure/Rules
→ Payrun Eligibility
→ Create Payrun
→ Compute
→ Payslip
→ Validate
→ Mark Paid
→ Attendance / Time Off
→ PDF / Email
→ Dashboard
```

Prioritize a stable end-to-end demo over extra architecture or optional features.

---

## 10. Completion Report

After a Codex task, report only:

```text
Changed files
What was implemented
Targeted checks/tests run
Any real unresolved blocker
```

Do not perform additional work beyond the requested scope.
