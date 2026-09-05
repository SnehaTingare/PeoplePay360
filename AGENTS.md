# AGENTS.md — PeoplePay360

PeoplePay360 is currently in the **backend implementation phase**. Unless a task explicitly asks for frontend work, do not modify `client/`.

## 1. Project Architecture

PeoplePay360 is a modular-monolith MERN application:

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- REST API base: `/api/v1`

Core flow:

```text
Auth / RBAC
→ Employee
→ Contract + Working Schedule
→ Attendance + Time Off
→ Salary Structure + Salary Rules
→ Payrun
→ Payslip
→ PDF / Email / Live Dashboard
```

Business logic belongs in backend services, not controllers or frontend code.

## 2. Current Documentation

Use the current files under `docs/`:

```text
01-USER-FLOWS.md
02-ROLES-PERMISSIONS.md
03-STATE-MACHINES.md
AI-CODING-RULES.md
API-SPEC.md
BACKEND-STANDARDS.md
BUSINESS-RULES.md
MODULES.md
PROJECT-STRUCTURE.md
TEST-CASES.md
VALIDATION-ERROR-SPEC.md
```

`docs/DATABASE-SPEC.md` is not part of the current repository. Do not stop because it is missing and do not recreate it unless explicitly asked.

For persistence/model decisions, use `BUSINESS-RULES.md`, `API-SPEC.md`, `MODULES.md`, `PROJECT-STRUCTURE.md`, and the existing Mongoose models.

## 3. Canonical Resolutions

Some documents still contain older wording. The following decisions are already resolved and override those stale references.

### Roles

```text
EMPLOYEE
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### User / Employee states

```text
ACTIVE
INACTIVE
```

### Contract states

```text
DRAFT
RUNNING
EXPIRED
CANCELLED
```

`UPCOMING` may be derived for display only. Do not replace `RUNNING` with `ACTIVE`.

### Attendance states

```text
OPEN
PRESENT
LATE
OVERTIME
ABSENT
MISSING_CHECKOUT
```

### Leave Allocation states

```text
DRAFT
APPROVED
CANCELLED
```

### Leave Request states

```text
PENDING
APPROVED
REFUSED
```

Never use `REJECTED`.

### Payrun / Payslip states

```text
DRAFT
COMPUTED
VALIDATED
PAID
```

### Salary Rule calculation types

```text
FIXED
PERCENTAGE
FORMULA
```

Do not use `DERIVED_FORMULA`.

`CONTRACT_WAGE` is an input/base value only, not a calculation type.

### Salary Rule categories

```text
BASIC
ALLOWANCE
GROSS
DEDUCTION
NET
```

Do not introduce `CONTRIBUTION` as a canonical category.

If `DERIVED_FORMULA` or `CONTRIBUTION` appears in `PROJECT-STRUCTURE.md`, `MODULES.md`, or `BACKEND-STANDARDS.md`, treat it as stale wording. Do not stop on these known conflicts.

## 4. Read Only Relevant Docs

Do not read every `.md` file for every task.

### Foundation / Auth / Users / RBAC

Read:

```text
02-ROLES-PERMISSIONS.md
API-SPEC.md
BACKEND-STANDARDS.md
VALIDATION-ERROR-SPEC.md
AI-CODING-RULES.md
```

### Departments / Working Schedules / Employees

Read:

```text
01-USER-FLOWS.md
BUSINESS-RULES.md
API-SPEC.md
MODULES.md
BACKEND-STANDARDS.md
```

### Contracts / Attendance / Time Off

Read the relevant sections from:

```text
01-USER-FLOWS.md
03-STATE-MACHINES.md
BUSINESS-RULES.md
VALIDATION-ERROR-SPEC.md
API-SPEC.md
MODULES.md
BACKEND-STANDARDS.md
```

### Salary Configuration

Read:

```text
BUSINESS-RULES.md
VALIDATION-ERROR-SPEC.md
API-SPEC.md
MODULES.md
BACKEND-STANDARDS.md
```

### Payrun / Payslip / Payroll Engine

Read:

```text
01-USER-FLOWS.md
02-ROLES-PERMISSIONS.md
03-STATE-MACHINES.md
BUSINESS-RULES.md
VALIDATION-ERROR-SPEC.md
API-SPEC.md
MODULES.md
BACKEND-STANDARDS.md
```

Also read only the relevant payroll sections of `TEST-CASES.md`.

### PDF / Email / Dashboard

Read:

```text
BUSINESS-RULES.md
API-SPEC.md
MODULES.md
```

and only the relevant test sections.

## 5. Parallel Backend Ownership

### Group A — Platform + HR Core

Owns:

```text
auth
users
departments
schedules
employees
contracts
```

Sequence:

```text
Auth/User/RBAC
→ Departments
→ Working Schedules
→ Employees
→ Contracts
→ Contract resolution
```

### Group B — HR Operations + Payroll

Owns:

```text
attendance
timeOff
salaryConfig
payruns
payslips
notifications
reports
```

Sequence:

```text
Time Off Types
→ Salary Structures
→ Salary Rules
→ Attendance
→ Leave Allocations
→ Leave Requests
→ Payrun Eligibility
→ Payrun Create
→ Compute
→ Payslips
→ Validate
→ Mark Paid
→ PDF / Email
→ Dashboard
```

Do not duplicate Group A models/services inside Group B. Avoid modifying files owned by the other group unless the task explicitly requires integration.

## 6. Backend Architecture Rules

Normal flow:

```text
Route
→ Middleware
→ Controller
→ Service
→ Model / exported module service
```

- Routes: path, HTTP method, auth, authorization, validation, controller binding.
- Controllers: parse request, call service, send response, pass errors.
- Services: business rules, state transitions, cross-model coordination.
- Models: schema, indexes, persistence constraints.
- Frontend: never authoritative payroll/business logic.

Do not call controllers from other modules. Prefer exported services for cross-module business access.

## 7. Non-Negotiable Business Rules

### Contracts

- Preserve historical Contracts.
- Date ranges determine period applicability.
- Exactly one applicable Contract is required for payroll.
- No applicable Contract is blocking.
- Multiple applicable Contracts are blocking.
- Never silently choose one when multiple match.

### Working Schedule

```text
Expected time = End Time - Start Time - Break
```

Weekly Hours are derived by backend.

### Attendance

```text
Actual worked time = CheckOut - CheckIn
```

Do not subtract scheduled break automatically from actual Attendance.

Prevent a second open Check-In.

Missing checkout becomes `MISSING_CHECKOUT` and is a non-blocking payroll warning by default.

### Leave

- Only approved allocations create usable balance.
- Approved allocation-required leave consumes balance exactly once.
- REFUSED leave does not consume balance.
- Block a new request overlapping another `PENDING` or `APPROVED` request for the same Employee.
- Approval re-checks balance.

### Salary Rules

- Execute in ascending `sequence`.
- Calculation types are only `FIXED`, `PERCENTAGE`, `FORMULA`.
- Categories are only `BASIC`, `ALLOWANCE`, `GROSS`, `DEDUCTION`, `NET`.
- Formula handling must be safe.
- Never use `eval`, `Function(...)`, arbitrary JavaScript/Python, shell execution, or other executable user code.

### Payrun

Creation is two-step.

Step 1:

```text
Salary Structure + Period + optional filters
→ eligibility preview
```

Step 1 must not create a Payrun.

Step 2:

```text
explicit Employee selection
→ create DRAFT Payrun
```

State flow:

```text
DRAFT → COMPUTED → VALIDATED → PAID
```

`COMPUTED` may be recomputed before validation without creating duplicate Payslips.

Blocking payroll errors prevent Validate.

Missing bank details and attendance exceptions are warnings by default.

### Payslip

- Payslips are generated by Payrun computation.
- Do not expose arbitrary salary-result creation.
- Historical Payslips preserve snapshots of the values used.
- Later Contract or Salary Rule changes must not modify old finalized Payslips.

### Paid Payroll

`PAID` is immutable in the normal workflow.

Mark Paid records payroll state only. It does not perform a real bank transfer.

## 8. API Rules

Follow `docs/API-SPEC.md`.

Do not invent alternate endpoints.

Use explicit business-action endpoints, for example:

```text
POST /time-off/requests/:id/approve
POST /time-off/requests/:id/refuse

POST /payroll/payruns/:id/compute
POST /payroll/payruns/:id/validate
POST /payroll/payruns/:id/mark-paid
```

Do not implement generic state manipulation such as:

```text
PATCH /payroll/payruns/:id
{ "status": "PAID" }
```

Employee self-service must enforce ownership on the backend.

## 9. Validation / Error Rules

Reuse existing IDs from `VALIDATION-ERROR-SPEC.md`.

Do not invent a new domain error ID when an existing one already covers the case.

Known decisions:

```text
Missing required Employee department/position
→ reject

Insufficient leave balance
→ reject request / block approval and re-check on approval

Salary Structure with no active rules
→ blocking for payroll computation

Missing checkout / attendance exception
→ non-blocking WARNING by default
```

## 10. Security Rules

- Hash passwords.
- Never return plaintext passwords or password hashes.
- No public Admin registration.
- Enforce RBAC on backend.
- Enforce Employee resource ownership on backend.
- Validate incoming IDs and payloads.
- Do not expose stack traces or environment secrets.
- Do not execute arbitrary salary-rule code.
- Do not trust client-supplied Employee IDs for Employee self-service actions.

## 11. Codex Working Rules

For every task:

1. Inspect existing code first.
2. Read `AGENTS.md`.
3. Read only the relevant docs above.
4. Identify briefly which files need changes.
5. Implement only the requested backend scope.
6. Do not modify frontend unless explicitly asked.
7. Do not refactor unrelated modules.
8. Do not rename documented endpoints, roles, statuses, or error IDs.
9. Reuse existing utilities/services before creating duplicates.
10. Keep cross-module dependencies explicit.
11. Add/update targeted tests when practical.
12. Run relevant tests/lint/build commands.
13. Report changed files, implemented behavior, checks run, and unresolved issues.

Do not create unused abstractions or empty architecture-only folders.

## 12. Conflict Handling

### Known resolved conflicts — do not stop

```text
DERIVED_FORMULA vs FORMULA
→ FORMULA wins

CONTRIBUTION vs canonical Salary Rule categories
→ do not use CONTRIBUTION

REJECTED vs REFUSED
→ REFUSED wins

ACTIVE Contract vs RUNNING Contract
→ RUNNING wins

Missing DATABASE-SPEC.md
→ DATABASE-SPEC is not required in the current repo
```

### New conflicts

For any genuinely different unresolved conflict:

```text
STOP
→ identify both conflicting rules
→ explain which implementation decision is blocked
→ do not silently guess
```

Do not stop merely because a stale occurrence of one of the known resolved conflicts still exists.

## 13. Change Control

Do not silently change:

```text
roles
canonical statuses
state transitions
business calculations
API paths
request/response meaning
error IDs
ownership rules
module ownership
historical payroll behavior
```

If implementation genuinely requires a specification change, report it first.

## 14. Hackathon Priority

Prioritize this working backend path first:

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
```

Then complete:

```text
Attendance
Time Off
PDF
Email
Dashboard
```

Do not spend core implementation time on microservices, Redis, Kubernetes, complex event systems, real payment integration, statutory integrations, AI features, or unrelated refactors.

## 15. Definition of Done

A backend task is complete when:

- it matches the documented API,
- RBAC is enforced,
- business logic is in services,
- validation/error IDs are consistent,
- canonical states/roles are preserved,
- no unrelated module is broken,
- relevant checks pass,
- no hardcoded payroll result is introduced,
- historical payroll behavior remains intact.
