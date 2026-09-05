# PeoplePay360 — PROJECT-STRUCTURE.md

## 1. Architecture Goal

PeoplePay360 will be implemented as a **modular monolith** using the team's MERN stack: React/Vite on the frontend and Node.js/Express/MongoDB/Mongoose on the backend.

The architecture follows the existing project documents and workflow board:

- `01-USER-FLOWS.md`
- `02-ROLES-PERMISSIONS.md`
- `03-STATE-MACHINES.md`
- `BUSINESS-RULES.md`
- `VALIDATION-ERROR-SPEC.md`
- `TEST-CASES.md`
- supplied PeoplePay360 problem statement
- supplied HRMS OXP workflow PNG

The core dependency direction is:

```text
Auth/User
   ↓
Employee ← Schedule
   ↓
Contract
   ↓
Attendance + Time Off
   ↓
Salary Configuration
   ↓
Payrun
   ↓
Payslip
   ↓
PDF / Email / Dashboard
```

### Architecture principles

1. **Business logic lives in services, never controllers.**
2. Modules own their models and business rules.
3. Cross-module access happens through exported service contracts, not direct controller-to-controller calls.
4. Controllers translate HTTP input/output only.
5. Models define persistence shape and database constraints, not workflow decisions.
6. State transitions happen through explicit business actions such as `compute`, `validate`, `mark-paid`, `approve`, and `refuse`.
7. Historical payroll is immutable after finalization/paid state.
8. The dashboard is derived from real stored records.
9. Do not create microservices for the hackathon; preserve clean module boundaries inside one deployable backend.

---

## 2. Repository Layout

```text
peoplepay360/
├── README.md
├── docs/
│   ├── 01-USER-FLOWS.md
│   ├── 02-ROLES-PERMISSIONS.md
│   ├── 03-STATE-MACHINES.md
│   ├── BUSINESS-RULES.md
│   ├── VALIDATION-ERROR-SPEC.md
│   ├── TEST-CASES.md
│   ├── PROJECT-STRUCTURE.md
│   ├── BACKEND-STANDARDS.md
│   ├── API-SPEC.md
│   ├── MODULES.md
│   └── REQUIREMENTS-CHECKLIST.md
│
├── client/
│   ├── package.json
│   ├── vite.config.*
│   ├── .env.example
│   └── src/
│       ├── app/
│       │   ├── App.*
│       │   ├── router/
│       │   │   ├── routes.*
│       │   │   ├── ProtectedRoute.*
│       │   │   └── RoleRoute.*
│       │   └── providers/
│       │       ├── AuthProvider.*
│       │       └── AppProviders.*
│       │
│       ├── layouts/
│       │   ├── AppLayout/
│       │   ├── AuthLayout/
│       │   └── navigation/
│       │       └── roleNavigation.*
│       │
│       ├── features/
│       │   ├── auth/
│       │   │   ├── api/
│       │   │   ├── pages/
│       │   │   ├── components/
│       │   │   ├── hooks/
│       │   │   └── types/
│       │   ├── users/
│       │   ├── employees/
│       │   ├── schedules/
│       │   ├── contracts/
│       │   ├── attendance/
│       │   ├── timeOff/
│       │   │   ├── types/
│       │   │   ├── allocations/
│       │   │   └── requests/
│       │   ├── salaryConfig/
│       │   │   ├── structures/
│       │   │   └── rules/
│       │   ├── payruns/
│       │   ├── payslips/
│       │   └── reports/
│       │
│       ├── shared/
│       │   ├── api/
│       │   │   ├── httpClient.*
│       │   │   └── apiError.*
│       │   ├── components/
│       │   │   ├── DataTable/
│       │   │   ├── FormField/
│       │   │   ├── StatusBadge/
│       │   │   ├── ConfirmDialog/
│       │   │   ├── ErrorBanner/
│       │   │   └── LoadingState/
│       │   ├── constants/
│       │   │   ├── roles.*
│       │   │   └── statuses.*
│       │   ├── permissions/
│       │   │   └── permissions.*
│       │   ├── utils/
│       │   └── types/
│       │
│       ├── assets/
│       └── main.*
│
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.*
│   │   ├── server.*
│   │   │
│   │   ├── config/
│   │   │   ├── env.*
│   │   │   ├── database.*
│   │   │   └── mail.*
│   │   │
│   │   ├── core/
│   │   │   ├── errors/
│   │   │   │   ├── AppError.*
│   │   │   │   └── errorCodes.*
│   │   │   ├── middleware/
│   │   │   │   ├── authenticate.*
│   │   │   │   ├── authorize.*
│   │   │   │   ├── validateRequest.*
│   │   │   │   ├── notFound.*
│   │   │   │   └── errorHandler.*
│   │   │   ├── security/
│   │   │   │   ├── password.*
│   │   │   │   └── token.*
│   │   │   ├── http/
│   │   │   │   ├── response.*
│   │   │   │   └── pagination.*
│   │   │   ├── constants/
│   │   │   │   ├── roles.*
│   │   │   │   └── statuses.*
│   │   │   └── utils/
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.*
│   │   │   │   ├── auth.service.*
│   │   │   │   ├── auth.validation.*
│   │   │   │   └── auth.routes.*
│   │   │   ├── users/
│   │   │   │   ├── user.model.*
│   │   │   │   ├── user.controller.*
│   │   │   │   ├── user.service.*
│   │   │   │   ├── user.validation.*
│   │   │   │   ├── user.routes.*
│   │   │   │   └── bootstrapAdmin.service.*
│   │   │   ├── employees/
│   │   │   ├── schedules/
│   │   │   ├── contracts/
│   │   │   ├── attendance/
│   │   │   ├── timeOff/
│   │   │   │   ├── timeOffType.model.*
│   │   │   │   ├── allocation.model.*
│   │   │   │   ├── timeOffRequest.model.*
│   │   │   │   ├── timeOff.controller.*
│   │   │   │   ├── timeOff.service.*
│   │   │   │   ├── timeOff.validation.*
│   │   │   │   └── timeOff.routes.*
│   │   │   ├── salaryConfig/
│   │   │   │   ├── salaryStructure.model.*
│   │   │   │   ├── salaryRule.model.*
│   │   │   │   ├── salaryConfig.controller.*
│   │   │   │   ├── salaryConfig.service.*
│   │   │   │   ├── salaryConfig.validation.*
│   │   │   │   └── salaryConfig.routes.*
│   │   │   ├── payruns/
│   │   │   │   ├── payrun.model.*
│   │   │   │   ├── payrunWarning.model.*
│   │   │   │   ├── payrun.controller.*
│   │   │   │   ├── payrun.service.*
│   │   │   │   ├── payrollCalculation.service.*
│   │   │   │   ├── payrollEligibility.service.*
│   │   │   │   ├── payrun.validation.*
│   │   │   │   └── payrun.routes.*
│   │   │   ├── payslips/
│   │   │   │   ├── payslip.model.*
│   │   │   │   ├── payslip.controller.*
│   │   │   │   ├── payslip.service.*
│   │   │   │   ├── payslipPdf.service.*
│   │   │   │   └── payslip.routes.*
│   │   │   ├── notifications/
│   │   │   │   └── payslipEmail.service.*
│   │   │   └── reports/
│   │   │       ├── report.controller.*
│   │   │       ├── report.service.*
│   │   │       ├── report.validation.*
│   │   │       └── report.routes.*
│   │   │
│   │   └── routes/
│   │       └── index.*
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   └── modules/
│   │   ├── integration/
│   │   │   └── api/
│   │   └── fixtures/
│   └── scripts/
│       └── seedDemoData.*
│
└── .gitignore
```

---

## 3. Module Boundary Rules

### `auth`
Owns login/session/password-change flows. It may read User through the Users service; it does not own Employee data.

### `users`
Owns User accounts, password handling, role assignment, activation state, bootstrap Admin, and the User side of Employee-account linkage.

### `employees`
Owns Employee master data and orchestrates normal Employee onboarding through the exported Users service. It must not manipulate the User model directly or calculate payroll.

### `schedules`
Owns reusable weekly work patterns and weekly-hour calculation.

### `contracts`
Owns employment terms and historical contract resolution. Payroll uses the Contracts service rather than querying Contract model directly.

### `attendance`
Owns check-in/out, worked-hour calculation, attendance states and manual-correction audit metadata.

### `timeOff`
Owns Time Off Types, Allocations, Requests, approval/refusal and balance consumption.

### `salaryConfig`
Owns Salary Structures, Salary Rules, sequence/dependency validation and active/inactive states. It does not execute full Payruns.

### `payruns`
Owns the two-step Payrun workflow, eligibility, selected employees, state transitions, payroll computation orchestration, warnings and validation.

### `payslips`
Owns persisted employee payroll snapshots and PDF generation. Payslips are created through Payrun computation, not arbitrary public creation.

### `notifications`
Owns email delivery only. It must not change payroll state.

### `reports`
Owns read-only aggregations for the live Dashboard. It does not own source-of-truth transactional data.

---

## 4. Allowed Cross-Module Dependencies

```text
auth → users
employees → users (Employee account provisioning/link synchronization only)
contracts → employees, schedules, salaryConfig
attendance → employees, schedules

timeOff → employees

payruns → employees
payruns → contracts
payruns → schedules
payruns → attendance
payruns → timeOff
payruns → salaryConfig
payruns → payslips

payslips → employees, payruns
notifications → payslips, employees
reports → employees, contracts, attendance, timeOff, payruns, payslips
```

### Forbidden coupling

- Controllers must not import another module's models.
- Frontend features must not mutate another feature's server state directly.
- Reports must not update source records.
- Payslip PDF generation must not recalculate payroll independently.
- Email sending must not mark Payruns paid.
- Salary Rules must not contain arbitrary executable JavaScript/code.

---

## 5. Frontend Module Pattern

Each feature follows the same internal shape when needed:

```text
features/<module>/
├── api/          # HTTP calls only
├── pages/        # route-level screens
├── components/   # module-specific UI
├── hooks/        # module-specific orchestration
├── types/        # module API/view types
├── utils/        # feature-only helpers
└── index.*       # public exports
```

Do not create folders that have no real responsibility.

### Shared vs feature components

Place a component in `shared/components` only when at least two business modules can use it without knowing domain-specific rules.

Examples:
- `DataTable` → shared
- `StatusBadge` → shared
- `PayrunWarningPanel` → payruns
- `LeaveBalanceCard` → timeOff

---

## 6. Backend Module Pattern

```text
modules/<module>/
├── <entity>.model.*       # Mongoose schema/indexes
├── <module>.validation.*  # request/schema validation
├── <module>.service.*     # business logic
├── <module>.controller.*  # HTTP adapter only
├── <module>.routes.*      # route + middleware wiring
└── <module>.constants.*   # only if module-specific constants exist
```

Larger modules may split services by responsibility, as done for Payruns.

---

## 7. Source-of-Truth Conflict Resolutions Used by This Architecture

| Topic | Existing contradiction | Architecture resolution |
|---|---|---|
| Contract status | `03-STATE-MACHINES.md` freezes `DRAFT/RUNNING/EXPIRED/CANCELLED`; `BUSINESS-RULES.md` suggests `UPCOMING/ACTIVE/EXPIRED`. | Use the canonical statuses from `03-STATE-MACHINES.md`. Date-derived labels may be shown in UI but must not replace canonical stored state names. |
| Leave refusal status | `01-USER-FLOWS.md` and `03-STATE-MACHINES.md` use `REFUSED`; later Business Rules/Test docs use `REJECTED`. | Use canonical `REFUSED` and API action `/refuse`. Existing later docs should be normalized later. |
| Payrun Step 1 | Official brief requires Salary Structure + Period; `01-USER-FLOWS.md` additionally mentions Employee Type/applicable scope. | Persist only Salary Structure + Period as required Payrun scope. Employee Type may be an optional eligibility/UI filter, not a required Payrun field. |
| Salary calculation types | Flow doc uses `FIXED/PERCENTAGE/DERIVED_FORMULA`; Business Rules separately names Contract Wage and safe formulas. | Keep `FIXED`, `PERCENTAGE`, `DERIVED_FORMULA` as computation types. `DERIVED_FORMULA` uses a safe predefined `formulaKey` such as `CONTRACT_WAGE`, `GROSS`, `NET`, `UNPAID_LEAVE_DEDUCTION`. |
| Employee Payslip access | Role page in problem statement does not explicitly list it, but PDF/email delivery is to employees and internal docs allow own Payslips. | Allow Employees to view/download **own** Payslips only. |
| HR Manager dashboard | Brief describes Dashboard for HR/Payroll users while HR Manager has no payroll-feature access. | Reports service returns role-filtered fields. HR Manager may see HR/attendance/leave reporting; payroll financial actions/config remain inaccessible. |
| Salary contributions | Official problem statement mentions contributions; existing internal rule categories omit a distinct contribution category. | Add `CONTRIBUTION` as a supported Salary Rule category so the architecture fully covers the brief. |
| Direct Payslip CRUD | Role spec says Payroll User has CRU Payslip access, while functional flow creates Payslips through Payrun computation. | No arbitrary public `POST /payslips`. Creation occurs through Payrun Compute; Payroll roles may read and perform permitted pre-finalization updates through workflow actions/recompute. |

---

## 8. Final Architectural Decision

Use a **single frontend + single backend + single MongoDB database**, with strong internal feature/module boundaries. This is the most appropriate architecture for the 20-hour hackathon because it keeps deployment simple while still demonstrating production-style separation of concerns, reusable services, RBAC, historical data integrity, and testable payroll business logic.
