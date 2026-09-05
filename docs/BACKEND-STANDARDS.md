# PeoplePay360 — BACKEND-STANDARDS.md

## 1. Purpose

This document defines mandatory backend engineering standards for PeoplePay360. All backend modules must follow these rules so four developers can work independently without producing inconsistent architecture.

The standards are based on the approved user flows, role matrix, state machines, business rules, validation catalogue and test cases.

---

## 2. Request Processing Standard

Every protected request follows this order:

```text
HTTP Request
   ↓
Route
   ↓
Authenticate
   ↓
Authorize role/permission
   ↓
Ownership check when required
   ↓
Request-shape validation
   ↓
Controller
   ↓
Service business rules
   ↓
Model/database
   ↓
Controller response
   ↓
Global error handler on failure
```

No layer may skip service-level business validation because frontend validation is not trusted.

---

## 3. Controller Rules

Controllers are thin HTTP adapters.

### Controllers may
- read `params`, `query`, `body`, and authenticated user context;
- call one or more service methods;
- translate service results into HTTP status/response;
- pass errors to the global error handler.

### Controllers must not
- calculate salary;
- resolve contracts;
- consume leave balances;
- decide state transitions;
- query another module's model directly;
- hash passwords;
- implement RBAC rules inline repeatedly;
- format database-specific logic;
- send email directly.

A controller should answer: **“Which service operation corresponds to this HTTP request?”**

---

## 4. Service Rules

Services own business logic and use cases.

Examples:

```text
ContractService.resolveApplicableContract(employeeId, period)
ScheduleService.calculateWeeklyHours(scheduleLines)
AttendanceService.checkIn(employeeId, actor)
TimeOffService.approveRequest(requestId, actor)
SalaryConfigService.validateRuleDependencies(structureId)
PayrollEligibilityService.getEligibleEmployees(scope)
PayrunService.compute(payrunId, actor)
PayrunService.validate(payrunId, actor)
PayrunService.markPaid(payrunId, actor)
PayslipService.getOwnPayslip(userEmployeeId, payslipId)
ReportService.getPayrollDashboard(filters, actor)
```

### Service requirements
- enforce business preconditions;
- enforce state transition rules;
- use canonical error codes;
- call other modules through their services/public contracts;
- protect historical records;
- be independently unit-testable;
- avoid HTTP-specific objects such as `req`/`res`.

---

## 5. Model Rules

Mongoose models own persistence structure and database-level constraints.

Models should define:
- required fields;
- enums;
- indexes;
- timestamps;
- simple field normalization;
- references.

Models should not define:
- Payrun workflow transitions;
- leave approval policy;
- salary computation orchestration;
- role authorization;
- controller-like side effects.

### Recommended critical indexes

| Model | Index / Constraint | Reason |
|---|---|---|
| User | unique email | Prevent duplicate login identity. |
| Employee | unique employee code; optional unique work email | Stable HR identity. |
| Attendance | employee + date/open-state strategy | Prevent duplicate/open sessions. |
| Contract | employee + startDate + endDate | Fast period resolution. |
| SalaryRule | structureId + code unique | Prevent duplicate rule code. |
| Payslip | payrunId + employeeId unique | Prevent duplicate Payslip inside a Payrun. |
| Payrun | period + structure lookup | Reporting/query efficiency. |

Database indexes are defensive constraints; service validation remains mandatory.

---

## 6. Canonical Role Names

Use exactly:

```text
EMPLOYEE
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Do not introduce alternatives such as `SUPER_ADMIN`, `PAYROLL_ADMIN`, or `HR_USER` without changing the approved access specification.

---

## 7. Canonical State Names

Use `03-STATE-MACHINES.md` as the state-name authority.

```text
USER
ACTIVE
INACTIVE

EMPLOYEE
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

### Important contradiction resolution
Existing later docs sometimes use `REJECTED` for Time Off. New implementation must use **`REFUSED`** to match the frozen state machine and functional flow.

---

## 8. Business Actions, Not Arbitrary Status Updates

Never expose generic status writes such as:

```text
PATCH /payruns/:id { status: "PAID" }
```

Use explicit actions:

```text
POST /api/v1/payruns/:id/compute
POST /api/v1/payruns/:id/validate
POST /api/v1/payruns/:id/mark-paid

POST /api/v1/time-off/requests/:id/approve
POST /api/v1/time-off/requests/:id/refuse

POST /api/v1/time-off/allocations/:id/approve
POST /api/v1/time-off/allocations/:id/cancel
```

Each action service validates the current state and all required business conditions.

---

## 9. Validation Standard

Validation occurs at two levels.

### 9.1 Request validation
Checks shape/type/format:
- required fields;
- ID format;
- date syntax;
- enum values;
- number ranges;
- pagination/filter shape.

This happens before controller/service execution.

### 9.2 Business validation
Checks meaning and cross-record invariants:
- contract overlap;
- applicable contract count;
- leave balance availability;
- current state before transition;
- salary-rule dependencies;
- duplicate Payslip;
- Payrun eligibility;
- historical immutability.

Business validation belongs in services.

---

## 10. Error Standard

Use error codes from `VALIDATION-ERROR-SPEC.md` wherever one already exists.

Recommended error response shape, matching the existing specification:

```json
{
  "code": "CTR-002",
  "message": "Multiple contracts are applicable for this payroll period.",
  "severity": "ERROR",
  "details": {
    "employeeId": "..."
  }
}
```

### HTTP mapping

| Situation | HTTP |
|---|---:|
| Invalid/missing authentication | 401 |
| Authenticated but forbidden | 403 |
| Resource not found | 404 |
| Duplicate/conflict | 409 |
| Validation/business precondition failure | 400 or 422; team must use one convention consistently |
| Unexpected server failure | 500 |

### Architecture decision
Use **422 Unprocessable Entity** for valid JSON that fails domain/business validation, and **400 Bad Request** for malformed/request-shape validation. Existing error IDs remain unchanged.

### Do not expose
- stack traces in production responses;
- password hashes;
- database connection details;
- JWT secrets;
- raw provider/mail credentials.

---

## 11. Success Response Standard

Use predictable success responses:

### Single resource

```json
{
  "data": { }
}
```

### Collection

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Action result

```json
{
  "data": {
    "id": "...",
    "status": "COMPUTED"
  }
}
```

Do not return different envelope styles from different modules.

---

## 12. Naming Standards

### Files

```text
camelCase for implementation files where the team already uses JS conventions:
user.service.js
payrollCalculation.service.js

React components/pages:
PascalCase.jsx
PayrunDetailPage.jsx
```

### JavaScript identifiers

```text
camelCase        local variables/functions
PascalCase       models/classes/components
UPPER_SNAKE_CASE enum values/constants
```

### MongoDB collections/models

Use singular model names and standard collection pluralization.

```text
User
Employee
Contract
WorkingSchedule
Attendance
TimeOffType
TimeOffAllocation
TimeOffRequest
SalaryStructure
SalaryRule
Payrun
Payslip
```

### API paths

Use plural nouns and kebab-case actions:

```text
/api/v1/employees
/api/v1/working-schedules
/api/v1/time-off/requests
/api/v1/salary-structures
/api/v1/payruns/:id/mark-paid
```

Avoid verbs for normal CRUD paths.

---

## 13. Auth and RBAC Standard

### Authentication
- JWT-based authentication, per existing access-control document.
- Passwords hashed using a modern password hashing algorithm.
- Token secrets only in environment configuration.
- User account must be `ACTIVE`.

### Authorization
Backend authorization is mandatory on every protected route.

Conceptual order:

```text
authenticate
→ authorize(required permissions/roles)
→ ownership check if needed
→ validate request
→ controller
```

### Ownership examples

Employee requesting a Payslip:

```text
payslip.employeeId === authenticatedUser.employeeId
```

Employee requesting attendance:

```text
attendance.employeeId === authenticatedUser.employeeId
```

Frontend route hiding is UX only, not security.

---

## 14. User Provisioning Standard

### Bootstrap Admin
- create only if no Admin exists;
- source credentials from secure environment/provisioning input;
- hash password;
- never expose public Admin signup.

### Admin-created user
- validate unique email and frozen role value;
- generate temporary password or activation token;
- store only hash/token;
- force first-login password change for temporary-password MVP;
- create only internal/admin roles through `POST /users`;
- reject `EMPLOYEE` because normal Employee accounts are provisioned through `POST /employees`.

### Employee onboarding
- the Employee service orchestrates onboarding through the exported Users service;
- provision an `ACTIVE` User with role `EMPLOYEE` and `mustChangePassword = true`;
- persist only the password hash and return the temporary password once;
- establish reciprocal one-to-one `Employee.user` / `User.employeeId` links;
- use a transaction where supported or compensate newly created records on failure;
- resolve Employee self-service from the authenticated User ID and persisted relationship, not a JWT `employeeId` claim.

---

## 15. Contract Resolution Standard

All payroll-related modules must call the Contracts service for period resolution.

Applicable contract condition:

```text
contract.startDate <= period.end
AND
(contract.endDate == null OR contract.endDate >= period.start)
```

Expected result:
- `0` matches → blocking error;
- `1` match → use it;
- `>1` matches → blocking error.

Do not use “latest contract” as a shortcut.

At Contract create/update time, proactively reject overlapping applicable contracts; Payrun Compute performs the same check defensively.

---

## 16. Working Schedule Resolution Standard

Both Employee and Contract may reference a Working Schedule in the existing docs/problem statement.

Architecture resolution:

```text
If applicable Contract has scheduleId → use Contract schedule
Else if Employee has scheduleId → use Employee schedule
Else → schedule context is missing
```

This precedence must be implemented once in a Schedule/Contract context service and reused by Attendance/Payroll.

---

## 17. Time Off Transaction Standard

Approve Time Off through a single service operation that:

1. verifies Request = `PENDING`;
2. reloads current allocation/balance;
3. validates remaining balance where allocation is required;
4. changes Request to `APPROVED`;
5. updates consumed/remaining balance;
6. stores approver/timestamp.

The balance must be rechecked at approval even if it was checked when the employee created the request.

Refusal:
- `PENDING → REFUSED`;
- allocation remains unchanged.

---

## 18. Salary Rule Standard

Canonical external computation types:

```text
FIXED
PERCENTAGE
DERIVED_FORMULA
```

Recommended fields by computation type:

### FIXED
```text
amount
```

### PERCENTAGE
```text
percentage
basedOnCode
```

### DERIVED_FORMULA
Use a safe predefined key, not executable user code:

```text
CONTRACT_WAGE
GROSS
TOTAL_DEDUCTIONS
NET
UNPAID_LEAVE_DEDUCTION
OVERTIME_AMOUNT   # only if the team actually implements overtime payroll
```

Do not claim unsupported formulas are available.

### Categories
To cover the official brief:

```text
BASIC
ALLOWANCE
GROSS
DEDUCTION
CONTRIBUTION
NET
```

Rules execute in ascending `sequence`.

---

## 19. Payrun Standard

Payrun creation is two-step.

### Eligibility request
Does not create a Payrun.

Required scope:
- Salary Structure;
- Period Start;
- Period End.

Optional UI filter:
- Employee Type, because it appears in existing flow docs, but it is not a mandatory persisted Payrun field in the official B5 requirement.

### Payrun creation
Stores only explicitly selected eligible employees.

### Compute
Must be safe against duplicate Payslips and repeat compute.

Recommended approach:
- delete/replace only draft/computed generated lines within the same Payrun when recomputing;
- never create a second Payslip for the same `(payrunId, employeeId)`;
- never recompute `VALIDATED` or `PAID` Payruns.

### Validate
Allowed only from `COMPUTED` and with no blocking payroll errors.

### Mark Paid
Allowed only from `VALIDATED`.

### Paid immutability
No employee changes, period changes, structure changes, recomputation or deletion.

---

## 20. Payslip Snapshot Standard

The computed Payslip must persist the values actually used, including at minimum:
- employee identity reference;
- Payrun reference;
- payroll period;
- applicable Contract reference and wage snapshot;
- Salary Structure reference/name snapshot;
- rule-result lines;
- worked days/context used;
- gross;
- deductions;
- contributions if applicable;
- net.

Future Contract or Salary Rule changes must not change historical Payslips.

PDF generation reads the stored Payslip snapshot; it must not rerun payroll calculations.

---

## 21. Reporting Standard

Reports/Dashboard are read-only aggregations.

Rules:
- all numbers come from persisted records;
- apply filters in the database/service query, not by hardcoded frontend slicing;
- respect role-based field visibility;
- use `PAID` Payruns for “Total Net Salary Paid”;
- historical trends derive from historical Payruns/Payslips.

---

## 22. Logging and Audit Standard

At minimum log/audit important business actions:
- login failure/success at safe level;
- Admin user creation/role change;
- attendance manual correction;
- leave approval/refusal;
- Payrun Compute/Validate/Mark Paid;
- Payslip delivery failure.

Never log plaintext passwords, tokens, or full sensitive bank details.

---

## 23. Testing Standard

Tests mirror `TEST-CASES.md`.

### Unit tests
Target service business logic:
- contract resolution;
- weekly-hour calculation;
- leave balance consumption;
- salary rule ordering/calculation;
- Payrun state transitions;
- eligibility.

### Integration tests
Target HTTP + auth/RBAC + persistence:
- 401/403 behavior;
- create/update flows;
- Payrun action endpoints;
- own-record restrictions;
- duplicate constraints.

### End-to-end acceptance
At minimum:
1. Leave Allocation → Request → Approval → balance reduction.
2. Employee → Contract → Payrun → Compute → Payslip → Validate → Paid → PDF.

---

## 24. Definition of a Clean Backend Module

A backend module is complete when:
- routes are role-protected;
- request validation exists;
- controller is thin;
- service contains business logic;
- model has required indexes/constraints;
- canonical error codes are used;
- unit tests cover happy path + edge cases;
- integration tests cover auth and API behavior;
- no other controller/model reaches directly into its internals.
