# FRONTEND-STANDARDS.md

## Purpose

This document defines the common frontend standards for the project.
**All team members must follow the same structure, UI patterns,
libraries, and coding conventions.**

These standards are **frozen**. Do not change them or introduce new
conventions without an explicit team decision.

------------------------------------------------------------------------

## 1. Frontend Structure

Use the approved structure consistently:

``` text
frontend/src/
├── assets/
├── components/   # Reusable UI
├── pages/        # Complete screens
├── layouts/      # Common layouts
├── routes/       # Routing & route protection
├── services/     # API calls
├── hooks/        # Reusable hooks
├── context/      # Approved shared state
├── utils/        # Generic utilities
└── constants/    # Shared constants
```

Do not create alternative folders for the same purpose.

------------------------------------------------------------------------

## 2. Naming

-   Components/pages: `PascalCase` → `EmployeeTable.jsx`
-   Hooks: `useName` → `useEmployees.js`
-   Services: `camelCase` → `employeeService.js`
-   Constants: descriptive names → `payrollStatus.js`

Use clear, consistent names.

------------------------------------------------------------------------

## 3. Components & UI

-   Keep components small and focused.
-   **Reuse existing components before creating new ones.**
-   Use common components for Button, Input, Modal, Table, Badge,
    Loader, Toast, etc.
-   Do not create different versions of the same UI component without
    approval.
-   Keep the UI consistent in colors, typography, spacing, buttons,
    forms, tables and dialogs.
-   Follow responsive design for desktop, tablet and mobile.
-   Follow basic accessibility: labels, semantic HTML, keyboard
    usability and meaningful `alt` text.

------------------------------------------------------------------------

## 4. Pages vs Logic

``` text
Page
 ↓
Reusable Components
 ↓
Service / Hook
 ↓
API
```

-   Pages compose screens.
-   Components handle UI.
-   Services handle API communication.
-   Hooks handle reusable React logic.
-   Business logic must not be unnecessarily duplicated across
    components.
-   Authoritative payroll calculations remain on the backend.

------------------------------------------------------------------------

## 5. API & Backend Integration

-   All API calls must use the approved service/API layer.
-   Do not duplicate API implementations.
-   Do not change API endpoints, request/response formats or backend
    field names without approval.
-   Handle authentication and role-based access according to the
    approved API specification.
-   Frontend permission checks are for UX; backend authorization is the
    final authority.

------------------------------------------------------------------------

## 6. Forms & User Feedback

Forms should have:

-   Clear labels
-   Validation
-   Useful error messages
-   Loading state while submitting
-   Success/error feedback

For async operations, handle:

``` text
Loading
Success
Error
Empty
```

Lists/tables should show a proper empty state instead of a blank screen.

Use shared Toast/Modal/Error/Loading components.

------------------------------------------------------------------------

## 7. Role-Based UI

Show only the navigation/actions relevant to the user's role.

``` text
Employee           → Own HR, Attendance, Leave, Payslips
HR Manager         → Employees, Contracts, Attendance, Leave
HR Payroll User    → Salary Structures, Rules, Payruns
HR Payroll Manager → Payroll review/finalization
Admin              → Users, Roles, System configuration
```

Exact permissions must follow the approved specifications.

------------------------------------------------------------------------

## 8. State & Configuration

-   Use local state for local UI state.
-   Use shared state only when genuinely required and through the
    approved approach.
-   Use environment variables for environment-specific configuration.
-   Never hardcode secrets, passwords, API keys or tokens.

------------------------------------------------------------------------

## 9. Dependencies

**Do not install a new library without team approval.**

Before adding a package:

``` text
Check existing project solution
        ↓
Can existing library solve it?
        ↓
If not → Team approval
```

Do not introduce a new framework, UI library, state-management solution
or utility library independently.

------------------------------------------------------------------------

## 10. Code Quality

Every developer must:

-   Avoid duplicated code.
-   Remove unused imports/variables.
-   Keep functions focused.
-   Follow existing linting/formatting rules.
-   Avoid unnecessary comments and commented-out code.
-   Handle errors properly.
-   Keep changes limited to the feature being implemented.

------------------------------------------------------------------------

## 11. Git & Feature Development

Use feature branches:

``` text
main
 ├── feature/employee-management
 ├── feature/attendance
 ├── feature/leave
 └── feature/payroll
```

Before creating a PR:

``` text
✓ Follows project structure
✓ Reuses existing components
✓ Uses approved libraries
✓ API contract unchanged
✓ Loading/error/empty states handled
✓ Responsive UI checked
✓ No secrets committed
✓ Lint/build/tests pass
```

------------------------------------------------------------------------

## 12. Frozen Specification Rule

The frontend must follow:

``` text
PROJECT-STRUCTURE.md
FRONTEND-STANDARDS.md
ENGINEERING-CONSTRAINTS.md
AI-CODING-RULES.md
DATABASE-SPEC.md
API-SPEC.md
BACKEND-STANDARDS.md
```

If code conflicts with a frozen specification:

``` text
STOP
 ↓
Report the conflict
 ↓
Team decides
 ↓
Officially update specification if required
 ↓
Continue development
```

**Never silently change a frozen rule or invent a new permanent
convention.**

------------------------------------------------------------------------

## Final Principle

> **Consistency over individual preference. Reuse before creating.
> Follow the frozen specifications before making architectural
> decisions.**
