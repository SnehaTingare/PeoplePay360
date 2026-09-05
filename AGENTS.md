# AGENTS.md — PeoplePay360

This file is the short operating guide for Codex and other coding agents working in this repository.

Do not read every document for every task. Read only the documents listed for the module you are changing.

---

## 1. Project

PeoplePay360 is a modular-monolith MERN application:

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- API style: REST under `/api/v1`

Core flow:

```text
User/RBAC
  → Employee
  → Contract + Working Schedule
  → Attendance + Time Off
  → Salary Structure + Salary Rules
  → Payrun
  → Payslip
  → PDF / Email / Live Dashboard
```

---

## 2. Source-of-Truth Order

When implementing a task, use the relevant documents in this order:

1. `docs/01-USER-FLOWS.md` — required user/system workflow
2. `docs/02-ROLES-PERMISSIONS.md` — authorization and ownership
3. `docs/03-STATE-MACHINES.md` — canonical states/transitions
4. `docs/BUSINESS-RULES.md` — domain rules/calculations
5. `docs/VALIDATION-ERROR-SPEC.md` — validations/error IDs/severity
6. `docs/DATABASE-SPEC.md` — persistence shape/indexes/snapshots
7. `docs/API-SPEC.md` — endpoint contract
8. `docs/PROJECT-STRUCTURE.md` — code organization
9. `docs/TEST-CASES.md` — expected behavior/acceptance tests

If two documents genuinely conflict, do not guess or silently choose one. Stop and report the conflict.

Do not modify specification documents unless the task explicitly asks for a specification change.

---

## 3. Read Only What You Need

### Auth / Users / RBAC
Read:
- `02-ROLES-PERMISSIONS.md`
- `VALIDATION-ERROR-SPEC.md`
- `DATABASE-SPEC.md`
- `API-SPEC.md`

### Employees / Departments / Working Schedules
Read:
- `01-USER-FLOWS.md`
- `BUSINESS-RULES.md`
- `DATABASE-SPEC.md`
- `API-SPEC.md`

### Contracts
Read:
- `01-USER-FLOWS.md`
- `03-STATE-MACHINES.md`
- `BUSINESS-RULES.md`
- `VALIDATION-ERROR-SPEC.md`
- `DATABASE-SPEC.md`
- `API-SPEC.md`

### Attendance
Read:
- `01-USER-FLOWS.md`
- `03-STATE-MACHINES.md`
- `BUSINESS-RULES.md`
- `VALIDATION-ERROR-SPEC.md`
- `DATABASE-SPEC.md`
- `API-SPEC.md`

### Time Off / Allocations / Requests
Read:
- `01-USER-FLOWS.md`
- `03-STATE-MACHINES.md`
- `BUSINESS-RULES.md`
- `VALIDATION-ERROR-SPEC.md`
- `DATABASE-SPEC.md`
- `API-SPEC.md`

### Salary Structures / Salary Rules
Read:
- `BUSINESS-RULES.md`
- `VALIDATION-ERROR-SPEC.md`
- `DATABASE-SPEC.md`
- `API-SPEC.md`

### Payruns / Payslips / Payroll Engine
Read:
- `01-USER-FLOWS.md`
- `02-ROLES-PERMISSIONS.md`
- `03-STATE-MACHINES.md`
- `BUSINESS-RULES.md`
- `VALIDATION-ERROR-SPEC.md`
- `DATABASE-SPEC.md`
- `API-SPEC.md`
- relevant payroll sections of `TEST-CASES.md`

### PDF / Email
Read:
- `BUSINESS-RULES.md`
- `API-SPEC.md`
- relevant sections of `TEST-CASES.md`

### Dashboard / Reports
Read:
- `BUSINESS-RULES.md`
- `API-SPEC.md`
- relevant reporting tests in `TEST-CASES.md`

---

## 4. Canonical Values — Never Invent Alternatives

### Roles

```text
EMPLOYEE
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### User / Employee

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
DRAFT
COMPUTED
VALIDATED
PAID
```

### Salary Rule Categories

```text
BASIC
ALLOWANCE
GROSS
DEDUCTION
NET
```

### Salary Rule Calculation Types

```text
FIXED
PERCENTAGE
FORMULA
```

`CONTRACT_WAGE` is an input/base value, not a calculation type.

Do not introduce `DERIVED_FORMULA`, `CONTRIBUTION`, or other new canonical values unless the specifications are deliberately updated first.

---

## 5. Non-Negotiable Business Rules

- Employee is the central HR record.
- Payroll must use exactly one Contract applicable to the Payrun period.
- Overlapping applicable Contracts are a blocking payroll error.
- Working Schedule expected time = `EndTime - StartTime - Break`.
- Attendance worked time = `CheckOut - CheckIn`; do not automatically subtract the scheduled break.
- A second open Check-In for the same Employee is invalid.
- Only approved Leave Allocations provide usable balance.
- Approved allocation-required leave consumes balance exactly once.
- REFUSED leave does not consume balance.
- Overlapping `PENDING` or `APPROVED` leave requests for the same Employee are blocked.
- Salary Rules execute in ascending sequence.
- Salary formulas must be safe validated arithmetic; never execute arbitrary JavaScript/Python or `eval`.
- Payrun creation is two-step: eligibility preview first, explicit employee selection second.
- Step 1 must not create a Payrun.
- Payrun flow is `DRAFT → COMPUTED → VALIDATED → PAID`.
- `COMPUTED` Payruns may be recomputed before validation without creating duplicate Payslips.
- Blocking payroll errors prevent Validate.
- Missing bank details and attendance exceptions are non-blocking warnings by default.
- `PAID` Payruns and historical Payslips are immutable in the normal workflow.
- Payslips store historical snapshots; later Contract/Salary Rule changes must not alter old Payslips.
- Mark Paid records payment status only; it does not perform a real bank transfer.
- PDF, bulk email, and live Dashboard are required project features.
- Dashboard values must come from persisted data, never hardcoded values.

---

## 6. Architecture Rules

Backend dependency direction:

```text
Route
  → Middleware
  → Controller
  → Service
  → Model / exported service contracts
```

Responsibilities:

- Routes: URL + middleware wiring only.
- Controllers: HTTP parsing/response only.
- Services: business logic and state transitions.
- Models: schemas, indexes, persistence constraints.
- Validation: request/schema validation.
- React: presentation and client orchestration; never authoritative payroll/business logic.

Cross-module rules:

- Do not call controllers from other controllers/modules.
- Prefer exported module services for cross-module business access.
- Do not duplicate payroll logic in Payslip PDF, Email, Dashboard, or frontend code.
- Reports are read-only aggregations.
- Notifications must not change payroll state.
- Payslips are generated through Payrun computation; do not create arbitrary public Payslip creation endpoints.

---

## 7. API Rules

The API contract is `docs/API-SPEC.md`.

- Base path: `/api/v1`
- Do not invent endpoints.
- Do not silently rename request/response fields.
- Reuse documented error IDs.
- Use explicit action endpoints for workflow transitions.

Examples:

```text
POST /time-off/requests/:id/approve
POST /time-off/requests/:id/refuse

POST /payroll/payruns/:id/compute
POST /payroll/payruns/:id/validate
POST /payroll/payruns/:id/mark-paid
```

Never implement generic state manipulation such as:

```text
PATCH /payroll/payruns/:id { "status": "PAID" }
```

Employee self-service must enforce resource ownership on the backend.

---

## 8. Security Rules

- Passwords are always hashed.
- Never return password hashes.
- No public Admin registration.
- Backend RBAC is mandatory; hidden UI controls are not security.
- Validate ownership for Employee self-service records.
- Do not expose stack traces, environment secrets, database secrets, or sensitive implementation details.
- Never execute untrusted salary formula code.

---

## 9. Coding Rules for Codex

For every task:

1. Inspect the existing implementation first.
2. Read only the relevant docs listed above.
3. State briefly which files/modules you intend to modify.
4. Implement the smallest complete change that satisfies the task.
5. Do not refactor unrelated code.
6. Do not modify another module's contract unnecessarily.
7. Do not add a new package/dependency unless it is genuinely needed; report it before adding when avoidable.
8. Reuse existing shared utilities/components before creating duplicates.
9. Preserve existing naming conventions and directory structure.
10. Add/update tests for important business rules when practical.
11. Run the relevant tests/build/lint commands available in the repository after changes.
12. Report changed files, validation performed, and any unresolved issue.

Do not create empty placeholder abstractions or folders merely to match a theoretical architecture.

---

## 10. Change-Control Rule

Never silently change any of the following just to make implementation easier:

```text
roles
canonical statuses
state transitions
database relationships
Salary Rule semantics
payroll calculations
error IDs
API endpoints
request/response contracts
authorization rules
historical immutability rules
```

If implementation appears to require such a change:

```text
STOP
→ explain the conflict
→ identify the relevant specification
→ propose the smallest change
→ wait for approval
```

---

## 11. Hackathon Priority

Build working end-to-end behavior before optional infrastructure.

Primary success path:

```text
Login/RBAC
→ Employee
→ Contract + Schedule
→ Attendance / Leave
→ Salary Structure + Salary Rules
→ Payrun eligibility
→ Select Employees
→ Compute
→ Payslip + Warnings
→ Validate
→ Mark Paid
→ PDF / Email
→ Live Dashboard
```

Do not spend hackathon time on microservices, Kubernetes, Redis, complex audit infrastructure, real bank integration, statutory payroll integrations, AI features, or unrelated refactors before the required flow works.

---

## 12. Definition of Done for a Coding Task

A task is done when:

- implementation matches the relevant docs,
- backend authorization is enforced,
- validation/business rules are applied in services,
- canonical roles/statuses are preserved,
- API contract is preserved,
- no historical payroll behavior is broken,
- no hardcoded business result is introduced,
- the affected flow has been manually or automatically verified,
- unrelated modules remain untouched.
