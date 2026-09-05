# PeoplePay360 — API-SPEC.md

**Document Type:** REST API Contract  
**Version:** 1.0  
**Status:** Approved Draft for Implementation  
**Base Path:** `/api/v1`  
**Project:** PeoplePay360 — Integrated HR & Payroll Operations Platform

---

## 1. Purpose

This document defines the HTTP API contract for PeoplePay360.

It is derived from and must remain consistent with:

- `01-USER-FLOWS.md`
- `02-ROLES-PERMISSIONS.md`
- `03-STATE-MACHINES.md`
- `BUSINESS-RULES.md`
- `VALIDATION-ERROR-SPEC.md`
- `TEST-CASES.md`
- `DATABASE-SPEC.md`

The API must support the complete operational flow:

```text
Authentication / RBAC
        ↓
Employees
        ↓
Contracts + Working Schedules
        ↓
Attendance + Time Off
        ↓
Salary Structures + Salary Rules
        ↓
Two-Step Payrun
        ↓
Compute
        ↓
Payslips + Warnings
        ↓
Validate
        ↓
Mark Paid
        ↓
PDF / Bulk Email
        ↓
Live Dashboard
```

### Core API rule

Business state changes must be represented by explicit business-action endpoints.

Do **not** allow the frontend to arbitrarily change values such as:

```text
Payrun.status
LeaveRequest.status
LeaveAllocation.status
Contract.status
Payslip.status
```

through generic update requests.

---

# 2. API Conventions

## 2.1 Base URL

```text
/api/v1
```

Examples:

```text
POST /api/v1/auth/login
GET  /api/v1/employees
POST /api/v1/payroll/payruns/:id/compute
```

---

## 2.2 Data Format

Requests and responses use:

```text
Content-Type: application/json
```

JSON field naming convention:

```text
camelCase
```

Examples:

```text
salaryStructureId
periodStart
periodEnd
employeeType
```

---

## 2.3 Authentication

Protected endpoints require:

```http
Authorization: Bearer <JWT>
```

The JWT represents the authenticated `User`.

The backend must resolve:

```text
userId
role
accountStatus
linked employeeId, when applicable
```

Authorization is enforced on the backend even when the frontend hides an action.

---

## 2.4 Canonical Roles

Use exactly:

```text
EMPLOYEE
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

No API request may introduce alternate role names.

---

# 3. Standard Response Shapes

## 3.1 Single Resource

```json
{
  "data": {
    "id": "..."
  }
}
```

---

## 3.2 Successful Action

```json
{
  "data": {
    "id": "...",
    "status": "APPROVED"
  },
  "message": "Leave request approved successfully."
}
```

---

## 3.3 List Response

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

---

## 3.4 Error Response

Use the error format defined by `VALIDATION-ERROR-SPEC.md`:

```json
{
  "code": "CTR-002",
  "message": "Multiple contracts are applicable for this payroll period.",
  "severity": "BLOCKING",
  "details": {
    "employeeId": "..."
  }
}
```

Do not expose:

```text
password hashes
stack traces
database connection details
environment secrets
internal implementation details
```

---

# 4. HTTP Status Guidelines

| HTTP | Meaning |
|---|---|
| `200` | Successful read/update/action |
| `201` | Resource created |
| `400` | Invalid request/input |
| `401` | Missing/invalid authentication |
| `403` | Authenticated but forbidden |
| `404` | Resource not found |
| `409` | Duplicate/conflict/invalid current-state transition |
| `422` | Request is syntactically valid but blocked by business/payroll rules |
| `500` | Unexpected server error |

Existing domain error IDs from `VALIDATION-ERROR-SPEC.md` must be reused whenever applicable.

Generic missing-resource errors may use:

```text
RESOURCE_NOT_FOUND
```

with HTTP `404`.

---

# 5. Pagination, Search, and Filtering

List endpoints should support:

```text
?page=1
&limit=20
```

Default:

```text
page = 1
limit = 20
```

Recommended maximum:

```text
limit = 100
```

Searchable master-data endpoints may support:

```text
?q=<search-text>
```

Date ranges use ISO date values:

```text
YYYY-MM-DD
```

Example:

```text
GET /attendance?employeeId=...&from=2026-09-01&to=2026-09-30
```

---

# 6. Authentication API

## 6.1 Login

### `POST /auth/login`

**Access:** Public

### Request

```json
{
  "email": "rahul@company.com",
  "password": "********"
}
```

### Success — `200`

```json
{
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "...",
      "uniqueId": "PP360-U-000001",
      "firstName": "Rahul",
      "lastName": "Sharma",
      "email": "rahul@company.com",
      "role": "EMPLOYEE",
      "accountStatus": "ACTIVE",
      "mustChangePassword": false,
      "employeeId": "..."
    }
  }
}
```

### Errors

```text
AUTH-001 → invalid credentials
AUTH-004 → inactive user
```

No response should reveal whether the email or password was specifically incorrect.

---

## 6.2 Current User

### `GET /auth/me`

**Access:** Any authenticated active user

### Success

```json
{
  "data": {
    "id": "...",
    "uniqueId": "PP360-U-000001",
    "firstName": "Rahul",
    "lastName": "Sharma",
    "email": "rahul@company.com",
    "role": "EMPLOYEE",
    "accountStatus": "ACTIVE",
    "mustChangePassword": false,
    "employeeId": "..."
  }
}
```

---

## 6.3 Change Password

### `POST /auth/change-password`

**Access:** Authenticated user

### Request

```json
{
  "currentPassword": "temporary-password",
  "newPassword": "new-secure-password"
}
```

### Behavior

- Validate current password.
- Validate password policy.
- Store only the new password hash.
- Set `mustChangePassword = false`.

---

## 6.4 Logout

For the MVP, authentication is stateless JWT authentication.

No server-side logout endpoint is required unless token revocation/blacklisting is implemented.

Frontend logout may simply remove the stored token.

---

# 7. User Administration API

All User Administration endpoints are **ADMIN only**.

---

## 7.1 List Users

### `GET /users`

### Query

```text
role
accountStatus
q
page
limit
```

---

## 7.2 Create User

### `POST /users`

### Request

```json
{
  "firstName": "Rahul",
  "lastName": "Sharma",
  "email": "rahul@company.com",
  "role": "HR_MANAGER"
}
```

### Behavior

1. Validate role. Standalone creation accepts only `ADMIN`, `HR_MANAGER`, `HR_PAYROLL_USER`, and `HR_PAYROLL_MANAGER`.
2. Ensure email is unique.
3. Generate a temporary password.
4. Store only its hash.
5. Set:

```text
accountStatus = ACTIVE
mustChangePassword = true
```

6. Return/show the temporary credential only once or deliver it using the configured email mechanism.

Normal `EMPLOYEE` accounts must be provisioned through `POST /employees`; `POST /users` never creates an Employee or a half-linked account.

### Errors

```text
USR-001 → duplicate email
USR-002 → invalid role
USR-006 → normal EMPLOYEE accounts require Employee onboarding
```

---

## 7.3 Get User

### `GET /users/:id`

---

## 7.4 Update User Profile Data

### `PATCH /users/:id`

Allowed fields:

```text
firstName
lastName
email
```

Not allowed through this endpoint:

```text
password
passwordHash
role
accountStatus
employeeId
```

Role and account state use dedicated endpoints.

---

## 7.5 Change Role

### `PATCH /users/:id/role`

### Request

```json
{
  "role": "HR_PAYROLL_USER"
}
```

Only canonical role values are accepted.

---

## 7.6 Activate User

### `POST /users/:id/activate`

Result:

```text
accountStatus = ACTIVE
```

---

## 7.7 Deactivate User

### `POST /users/:id/deactivate`

Result:

```text
accountStatus = INACTIVE
```

An inactive user cannot authenticate.

---

## 7.8 Reset User Password

### `POST /users/:id/reset-password`

### Behavior

- Generate new temporary password.
- Replace stored hash.
- Set `mustChangePassword = true`.
- Return/show temporary credential only once or send it using configured delivery.

Existing passwords are never returned.

---

# 8. Department API

Department is supporting HR master data used by Employees, Contracts, filters, and reporting.

## Permissions

| Action | Roles |
|---|---|
| Read | HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN |
| Create/Update | HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN |
| Deactivate | HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN |

---

## 8.1 List Departments

### `GET /departments`

Query:

```text
active
q
page
limit
```

---

## 8.2 Create Department

### `POST /departments`

```json
{
  "name": "Engineering",
  "code": "ENG",
  "description": "Engineering Department",
  "managerId": "optional-employee-id"
}
```

---

## 8.3 Get Department

### `GET /departments/:id`

---

## 8.4 Update Department

### `PATCH /departments/:id`

---

## 8.5 Deactivate Department

### `POST /departments/:id/deactivate`

Do not hard-delete a Department already referenced by historical Employees, Contracts, or Payslips.

---

# 9. Working Schedule API

## Permissions

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

---

## 9.1 List Schedules

### `GET /working-schedules`

Query:

```text
active
q
page
limit
```

---

## 9.2 Create Schedule

### `POST /working-schedules`

### Request

```json
{
  "name": "Standard 40 Hours",
  "type": "STANDARD",
  "workingDays": [
    {
      "day": "MONDAY",
      "isWorkingDay": true,
      "startTime": "09:00",
      "endTime": "18:00",
      "breakMinutes": 60
    }
  ]
}
```

### Server behavior

The client does not provide authoritative `weeklyHours`.

Backend calculates:

```text
daily expected minutes
= end - start - break

weeklyHours
= sum(daily expected minutes) / 60
```

### Errors

```text
SCH-001
SCH-002
SCH-003
SCH-004
```

For MVP, overnight shifts are not supported.

---

## 9.3 Get Schedule

### `GET /working-schedules/:id`

---

## 9.4 Update Schedule

### `PATCH /working-schedules/:id`

Backend recalculates `weeklyHours`.

---

## 9.5 Deactivate Schedule

### `POST /working-schedules/:id/deactivate`

Historical references remain valid.

---

# 10. Employee API

## 10.1 Employee Self Profile

### `GET /employees/me`

**Access:** `EMPLOYEE` with linked Employee record.

Returns the authenticated user's Employee record only. The backend resolves the Employee from the authenticated User ID through the persisted `Employee.user` relationship; it does not require or trust an `employeeId` JWT claim.

---

## 10.2 List Employees

### `GET /employees`

**Access:**

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### Query

```text
q
departmentId
employeeType
employmentStatus
managerId
page
limit
```

---

## 10.3 Create Employee

### `POST /employees`

**Access:**

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### Request

```json
{
  "firstName": "Rahul",
  "lastName": "Sharma",
  "email": "rahul@company.com",
  "phone": "9999999999",
  "departmentId": "...",
  "managerId": "...",
  "jobPosition": "Software Engineer",
  "employeeType": "FULL_TIME",
  "workingScheduleId": "...",
  "joiningDate": "2026-07-01",
  "bankDetails": {
    "accountHolderName": "Rahul Sharma",
    "accountNumber": "********",
    "bankName": "Example Bank",
    "ifscCode": "EXAM0000001"
  }
}
```

### Server defaults

```text
employmentStatus = ACTIVE
```

The normal request does not accept `userId`. Employee onboarding internally provisions a User with role `EMPLOYEE`, account status `ACTIVE`, and `mustChangePassword = true`, then links both records.

### Success

```json
{
  "data": {
    "employee": {
      "id": "...",
      "employeeId": "PP360-E-...",
      "user": "...",
      "firstName": "Rahul",
      "lastName": "Sharma",
      "email": "rahul@company.com",
      "employmentStatus": "ACTIVE"
    },
    "accountProvisioning": {
      "userId": "...",
      "email": "rahul@company.com",
      "temporaryPassword": "...",
      "mustChangePassword": true
    }
  }
}
```

`temporaryPassword` is returned only by the initial successful Employee-creation response. It is never persisted, logged, serialized on later reads, or retrievable again.

### Validation

- email unique
- User email available for Employee account provisioning
- department required
- job position required
- employee cannot be own manager
- referenced records must exist

### Errors

```text
EMP-001
EMP-002
EMP-003
USR-001
```

---

## 10.4 Get Employee

### `GET /employees/:id`

**Access:** HR/Payroll/Admin roles.

Employee self-service uses `/employees/me`.

---

## 10.5 Update Employee

### `PATCH /employees/:id`

**Access:** HR/Payroll/Admin roles.

Allowed to update HR profile/master-data fields.

Do not use this endpoint to modify:

```text
Contract wage
Contract history
Payrun state
Payslip calculation
```

---

## 10.6 Activate Employee

### `POST /employees/:id/activate`

Result:

```text
employmentStatus = ACTIVE
```

The linked `EMPLOYEE` User account is also set to `ACTIVE`.

---

## 10.7 Deactivate Employee

### `POST /employees/:id/deactivate`

Result:

```text
employmentStatus = INACTIVE
```

The linked `EMPLOYEE` User account is also set to `INACTIVE`. Employee actions never change an Admin/HR/Payroll account.

Historical Contracts and Payslips remain stored.

Inactive Employees are excluded from normal future Payrun eligibility.

---

# 11. Contract API

## Permissions

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Employees have no Contract administration access.

---

## 11.1 List Contracts

### `GET /contracts`

Query:

```text
employeeId
departmentId
salaryStructureId
status
from
to
page
limit
```

Employee smart-button navigation should use:

```text
GET /contracts?employeeId=<employee-id>
```

---

## 11.2 Create Contract

### `POST /contracts`

### Request

```json
{
  "employeeId": "...",
  "departmentId": "...",
  "jobPosition": "Software Engineer",
  "workingScheduleId": "...",
  "salaryStructureId": "...",
  "wage": 50000,
  "wageType": "MONTHLY",
  "startDate": "2026-09-01",
  "endDate": null
}
```

### Server default

```text
status = DRAFT
```

The client may not create a Contract directly in `RUNNING`, `EXPIRED`, or `CANCELLED`.

---

## 11.3 Get Contract

### `GET /contracts/:id`

---

## 11.4 Update Draft Contract

### `PATCH /contracts/:id`

Normal employment-term editing is allowed while:

```text
status = DRAFT
```

A `RUNNING`, `EXPIRED`, or historically referenced Contract must not be silently overwritten.

Changes to future employment terms should normally be represented by a new Contract.

---

## 11.5 Start Contract

### `POST /contracts/:id/start`

### Transition

```text
DRAFT → RUNNING
```

### Backend validation

- Contract dates valid.
- Wage valid.
- Salary Structure exists.
- Working Schedule exists.
- No conflicting applicable Contract exists for the Employee.

### Conflict

```text
CTR-002
```

---

## 11.6 Cancel Contract

### `POST /contracts/:id/cancel`

Allowed transitions:

```text
DRAFT   → CANCELLED
RUNNING → CANCELLED
```

Cancellation must not rewrite historical Payslip snapshots.

---

## 11.7 Expiration

### `POST /contracts/:id/expire`

```text
RUNNING → EXPIRED
```

may be synchronized automatically from `endDate` by backend application logic.

The frontend does not directly set `EXPIRED`.

---

## 11.8 Delete Contract

### `DELETE /contracts/:id`

Allowed only when:

```text
status = DRAFT
AND
Contract is not referenced by historical payroll
```

Otherwise reject and preserve history.

---

# 12. Salary Structure Reference Lookup for HR Contract Forms

HR Managers may need to select a Salary Structure while creating/editing a Contract, but they must not receive payroll configuration access.

### `GET /reference/salary-structures`

**Access:**

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### Response

Only active minimal reference data:

```json
{
  "data": [
    {
      "id": "...",
      "name": "Regular Salary",
      "code": "REGULAR"
    }
  ]
}
```

This endpoint does **not** expose Salary Rule configuration to `HR_MANAGER`.

---

# 13. Attendance API

## 13.1 My Attendance

### `GET /attendance/me`

**Access:** `EMPLOYEE`

Query:

```text
from
to
status
page
limit
```

Returns only the authenticated Employee's records.

---

## 13.2 Employee Check-In

### `POST /attendance/check-in`

**Access:** `EMPLOYEE`

### Request

No employee ID is accepted.

```json
{}
```

### Behavior

- Resolve Employee from authenticated User.
- Reject if an open attendance record already exists.
- Store server timestamp as `checkIn`.
- Create:

```text
status = OPEN
```

### Error

```text
ATT-003
```

---

## 13.3 Employee Check-Out

### `POST /attendance/check-out`

**Access:** `EMPLOYEE`

### Request

```json
{}
```

### Behavior

1. Find authenticated Employee's open attendance.
2. Set server timestamp as `checkOut`.
3. Compute:

```text
workedMinutes = checkOut - checkIn
```

4. Determine attendance status.
5. Persist completed record.

Scheduled Working Schedule break is **not** automatically subtracted from actual attendance duration.

### Errors

```text
ATT-001
ATT-002
```

---

## 13.4 List Attendance

### `GET /attendance`

**Access:**

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Query:

```text
employeeId
departmentId
status
from
to
page
limit
```

Employee smart-button navigation:

```text
GET /attendance?employeeId=<employee-id>
```

---

## 13.5 Create Manual Attendance

### `POST /attendance`

**Access:** HR/Payroll/Admin roles above.

### Request

```json
{
  "employeeId": "...",
  "checkIn": "2026-09-05T09:00:00+05:30",
  "checkOut": "2026-09-05T18:00:00+05:30",
  "notes": "Manual attendance entry"
}
```

Backend:

- validates timestamps,
- calculates `workedMinutes`,
- derives status,
- sets `manualEdit = true`,
- records authenticated User in `editedBy`.

---

## 13.6 Get Attendance

### `GET /attendance/:id`

Access:

- HR/Payroll/Admin, or
- Employee only when the record belongs to them.

---

## 13.7 Correct Attendance

### `PATCH /attendance/:id`

**Access:**

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### Request

```json
{
  "checkIn": "2026-09-05T09:05:00+05:30",
  "checkOut": "2026-09-05T18:05:00+05:30",
  "correctionReason": "Corrected after employee confirmation"
}
```

### Backend

- validates timestamps,
- recalculates worked time/status,
- sets `manualEdit = true`,
- stores `editedBy`.

### Errors

```text
ATT-002
ATT-005
ATT-006
```

---

# 14. Time Off Type API

## Permissions

### Read active Types

Any authenticated user who needs Time Off selection.

### Manage Types

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

---

## 14.1 List Time Off Types

### `GET /time-off/types`

Query:

```text
active
unit
requiresAllocation
q
```

---

## 14.2 Create Time Off Type

### `POST /time-off/types`

```json
{
  "name": "Casual Leave",
  "code": "CL",
  "description": "Casual leave",
  "unit": "DAYS",
  "requiresAllocation": true,
  "requiresApproval": true,
  "isPaid": true,
  "payrollTreatment": "PAID"
}
```

Supported payroll treatment:

```text
NONE
PAID
UNPAID_DEDUCTION
```

---

## 14.3 Get Time Off Type

### `GET /time-off/types/:id`

---

## 14.4 Update Time Off Type

### `PATCH /time-off/types/:id`

Do not rewrite the meaning of historical approved leave/payroll records.

---

## 14.5 Deactivate Time Off Type

### `POST /time-off/types/:id/deactivate`

Inactive types cannot be selected for new requests.

---

# 15. Leave Allocation API

## 15.1 My Leave Allocations / Balances

### `GET /time-off/allocations/me`

**Access:** `EMPLOYEE`

Query:

```text
timeOffTypeId
status
```

Only the authenticated Employee's allocations are returned.

---

## 15.2 List Allocations

### `GET /time-off/allocations`

**Access:**

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Query:

```text
employeeId
timeOffTypeId
status
validOn
page
limit
```

Employee smart-button navigation:

```text
GET /time-off/allocations?employeeId=<employee-id>
```

---

## 15.3 Create Allocation

### `POST /time-off/allocations`

**Access:** HR/Payroll/Admin roles.

### Request

```json
{
  "employeeId": "...",
  "timeOffTypeId": "...",
  "allocatedAmount": 12,
  "validFrom": "2026-01-01",
  "validUntil": "2026-12-31"
}
```

### Server default

```text
status = DRAFT
takenAmount = 0
remainingAmount = allocatedAmount
```

---

## 15.4 Get Allocation

### `GET /time-off/allocations/:id`

Access:

- HR/Payroll/Admin, or
- Employee when it belongs to them.

---

## 15.5 Update Draft Allocation

### `PATCH /time-off/allocations/:id`

Editable only while:

```text
status = DRAFT
```

---

## 15.6 Approve Allocation

### `POST /time-off/allocations/:id/approve`

### Transition

```text
DRAFT → APPROVED
```

Backend records:

```text
approvedBy
approvedAt
```

Only approved allocations contribute usable balance.

---

## 15.7 Cancel Allocation

### `POST /time-off/allocations/:id/cancel`

Allowed when cancellation does not invalidate already-consumed historical leave.

Canonical result:

```text
CANCELLED
```

---

## 15.8 Delete Allocation

### `DELETE /time-off/allocations/:id`

Allowed only for an unused `DRAFT` allocation.

Approved/consumed allocations must be preserved.

---

# 16. Leave Request API

## 16.1 My Leave Requests

### `GET /time-off/requests/me`

**Access:** `EMPLOYEE`

Query:

```text
status
from
to
page
limit
```

---

## 16.2 List Leave Requests

### `GET /time-off/requests`

**Access:**

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Query:

```text
employeeId
timeOffTypeId
status
from
to
page
limit
```

Employee smart-button navigation:

```text
GET /time-off/requests?employeeId=<employee-id>
```

---

## 16.3 Create Leave Request

### `POST /time-off/requests`

**Access:**

```text
EMPLOYEE
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### Employee Request

```json
{
  "timeOffTypeId": "...",
  "startDate": "2026-09-10",
  "endDate": "2026-09-11",
  "reason": "Personal work"
}
```

When caller role is `EMPLOYEE`, the backend always derives `employeeId` from the authenticated User.

The frontend cannot submit another Employee's ID.

### HR-created Request

Authorized HR roles may additionally provide:

```json
{
  "employeeId": "...",
  "timeOffTypeId": "...",
  "startDate": "2026-09-10",
  "endDate": "2026-09-11",
  "reason": "Recorded by HR"
}
```

### Server behavior

1. Validate date range.
2. Calculate duration.
3. Validate Time Off Type.
4. Block overlap with an existing `PENDING` or `APPROVED` request for that Employee.
5. If allocation is required:
   - locate an approved valid allocation,
   - ensure requested duration does not exceed remaining balance.
6. Create:

```text
status = PENDING
```

### Errors

```text
LEV-001
LEV-002
LEV-003
LEV-004
LEV-005
```

---

## 16.4 Get Leave Request

### `GET /time-off/requests/:id`

Access:

- HR/Payroll/Admin, or
- Employee when request belongs to them.

---

## 16.5 Approve Leave Request

### `POST /time-off/requests/:id/approve`

**Access:**

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### Preconditions

```text
status = PENDING
```

### Backend behavior

The approval operation must atomically:

1. Re-fetch the PENDING request.
2. Re-check allocation validity where required.
3. Re-check remaining balance.
4. Increase consumed/taken amount exactly once.
5. Recalculate remaining amount.
6. Set:

```text
status = APPROVED
decisionBy = authenticated user
decisionAt = current timestamp
```

### Errors

```text
LEV-002
LEV-003
LEV-005
LEV-008
```

Calling Approve again on an already-final request must not consume balance twice.

---

## 16.6 Refuse Leave Request

### `POST /time-off/requests/:id/refuse`

**Access:** Same HR roles as Approve.

### Optional Request

```json
{
  "comment": "Insufficient staffing for selected dates"
}
```

### Transition

```text
PENDING → REFUSED
```

### Rules

- Allocation is unchanged.
- Record `decisionBy` and `decisionAt`.
- `REFUSED` is the canonical status.
- Do not use `REJECTED`.

---

# 17. Salary Structure API

Base path:

```text
/payroll/structures
```

## Permissions

### Read full configuration

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### Create/Update/Deactivate/Delete

```text
HR_PAYROLL_MANAGER
ADMIN
```

`HR_MANAGER` may only use the minimal `/reference/salary-structures` lookup for Contract assignment.

---

## 17.1 List Salary Structures

### `GET /payroll/structures`

Query:

```text
active
q
page
limit
```

---

## 17.2 Create Salary Structure

### `POST /payroll/structures`

```json
{
  "name": "Regular Salary",
  "code": "REGULAR",
  "description": "Standard employee salary structure"
}
```

### Server defaults

```text
active = true
```

### Validation

- name required
- code required
- code unique

---

## 17.3 Get Salary Structure

### `GET /payroll/structures/:id`

May include ordered rule summary.

---

## 17.4 Update Salary Structure

### `PATCH /payroll/structures/:id`

Allowed for Payroll Manager/Admin.

Historical Payslips remain unchanged.

---

## 17.5 Activate Salary Structure

### `POST /payroll/structures/:id/activate`

---

## 17.6 Deactivate Salary Structure

### `POST /payroll/structures/:id/deactivate`

Inactive Structures cannot be selected for new Payruns.

Existing historical references remain valid.

---

## 17.7 Delete Salary Structure

### `DELETE /payroll/structures/:id`

Allowed only when not referenced by Contracts, Payruns, or historical Payslips.

Otherwise deactivate it.

---

# 18. Salary Rule API

Base path:

```text
/payroll/rules
```

## Permissions

### Read

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### Create/Update/Activate/Deactivate/Delete

```text
HR_PAYROLL_MANAGER
ADMIN
```

---

## 18.1 List Salary Rules

### `GET /payroll/rules`

Query:

```text
salaryStructureId
category
active
page
limit
```

Default ordering when `salaryStructureId` is supplied:

```text
sequence ASC
```

---

## 18.2 Create Salary Rule

### `POST /payroll/rules`

### FIXED Example

```json
{
  "salaryStructureId": "...",
  "name": "Travel Allowance",
  "code": "TRAVEL",
  "category": "ALLOWANCE",
  "sequence": 30,
  "calculationType": "FIXED",
  "fixedAmount": 2000
}
```

### PERCENTAGE Example

```json
{
  "salaryStructureId": "...",
  "name": "House Rent Allowance",
  "code": "HRA",
  "category": "ALLOWANCE",
  "sequence": 20,
  "calculationType": "PERCENTAGE",
  "percentage": 20,
  "percentageBase": "BASIC"
}
```

### FORMULA Example

```json
{
  "salaryStructureId": "...",
  "name": "Gross Salary",
  "code": "GROSS",
  "category": "GROSS",
  "sequence": 40,
  "calculationType": "FORMULA",
  "formula": "BASIC + HRA + TRAVEL"
}
```

### Canonical Calculation Types

```text
FIXED
PERCENTAGE
FORMULA
```

`CONTRACT_WAGE` is an available base/input and is **not** a calculation type.

Example BASIC rule:

```json
{
  "salaryStructureId": "...",
  "name": "Basic Salary",
  "code": "BASIC",
  "category": "BASIC",
  "sequence": 10,
  "calculationType": "PERCENTAGE",
  "percentage": 100,
  "percentageBase": "CONTRACT_WAGE"
}
```

---

## 18.3 Safe Formula Contract

A `FORMULA` value represents an arithmetic expression only.

Allowed identifiers:

```text
CONTRACT_WAGE
previously computed Salary Rule codes
approved payroll context identifiers explicitly supported by backend
```

Allowed operators:

```text
+
-
*
/
(
)
numeric literals
```

Do not allow:

```text
JavaScript
Python
eval
function calls
object/property access
file access
network access
shell commands
arbitrary executable code
```

The backend must parse/validate the expression before use.

---

## 18.4 Salary Rule Validation

Rules:

- Rule code unique within its Salary Structure.
- Sequence required.
- Dependency must exist.
- A dependent rule cannot depend on a later rule.
- Circular dependency is invalid.
- Invalid numeric result blocks computation.
- Only active rules participate in new payroll computation.

Errors:

```text
SAL-001
SAL-002
SAL-003
SAL-004
SAL-005
SAL-006
SAL-007
SAL-008
SAL-009
```

---

## 18.5 Get Salary Rule

### `GET /payroll/rules/:id`

---

## 18.6 Update Salary Rule

### `PATCH /payroll/rules/:id`

Future computations use updated configuration.

Historical Payslips do not change.

---

## 18.7 Activate Salary Rule

### `POST /payroll/rules/:id/activate`

---

## 18.8 Deactivate Salary Rule

### `POST /payroll/rules/:id/deactivate`

Inactive Rules do not participate in future computation.

---

## 18.9 Delete Salary Rule

### `DELETE /payroll/rules/:id`

Allowed only when safe and not required by historical/reference constraints.

Prefer deactivation after the rule has been used.

---

# 19. Two-Step Payrun Creation API

This section is mandatory.

Base:

```text
/payroll/payruns
```

Allowed roles:

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

---

## 19.1 Step 1 — Determine Eligible Employees

### `POST /payroll/payruns/eligible-employees`

This endpoint performs Payrun setup/preview only.

**It MUST NOT create a Payrun.**

### Request

```json
{
  "salaryStructureId": "...",
  "periodStart": "2026-09-01",
  "periodEnd": "2026-09-30",
  "employeeType": "FULL_TIME",
  "departmentId": "optional"
}
```

Only:

```text
salaryStructureId
periodStart
periodEnd
```

are mandatory.

Employee Type and Department are optional scope filters.

### Eligibility Requirements

Employee is eligible when:

```text
Employee is ACTIVE

AND

exactly one Contract overlaps the Payrun period

AND

applicable Contract Salary Structure
matches selected Payrun Salary Structure

AND

employee is not already payroll-duplicated
for the same relevant period/scope
```

### Response — `200`

```json
{
  "data": {
    "eligibleEmployees": [
      {
        "employeeId": "...",
        "employeeCode": "PP360-E-000001",
        "name": "Rahul Sharma",
        "department": {
          "id": "...",
          "name": "Engineering"
        },
        "employeeType": "FULL_TIME",
        "contractId": "...",
        "wage": 50000
      }
    ],
    "ineligibleEmployees": [
      {
        "employeeId": "...",
        "name": "Example Employee",
        "reasonCode": "CTR-003",
        "message": "No applicable contract exists for this payroll period."
      }
    ]
  }
}
```

### Important

No Payrun ID is returned because no Payrun has been created.

---

## 19.2 Step 2 — Create Payrun

### `POST /payroll/payruns`

### Request

```json
{
  "name": "September 2026 Payroll",
  "salaryStructureId": "...",
  "periodStart": "2026-09-01",
  "periodEnd": "2026-09-30",
  "employeeTypeFilter": "FULL_TIME",
  "departmentFilterId": null,
  "selectedEmployeeIds": [
    "...",
    "..."
  ]
}
```

### Backend behavior

1. Validate Salary Structure.
2. Validate period.
3. Ensure at least one Employee was selected.
4. Revalidate every selected Employee's eligibility.
5. Reject creation if selected Employee data became invalid between Step 1 and Step 2.
6. Store only explicitly selected Employees.
7. Create:

```text
status = DRAFT
```

### Success — `201`

```json
{
  "data": {
    "id": "...",
    "name": "September 2026 Payroll",
    "salaryStructureId": "...",
    "periodStart": "2026-09-01",
    "periodEnd": "2026-09-30",
    "employeeCount": 2,
    "status": "DRAFT"
  }
}
```

### Errors

```text
PAY-001
PAY-002
PAY-003
CTR-002
CTR-003
CTR-007
PAY-006
PAY-015
```

---

# 20. Payrun Management API

## 20.1 List Payruns

### `GET /payroll/payruns`

Query:

```text
status
salaryStructureId
from
to
page
limit
```

---

## 20.2 Get Payrun

### `GET /payroll/payruns/:id`

Recommended response includes:

```text
Payrun metadata
selected employee count
totals
warnings/errors
Payslip summary
created/computed/validated/paid actors and timestamps
```

---

## 20.3 Edit Draft Payrun

### `PATCH /payroll/payruns/:id`

Allowed only while:

```text
status = DRAFT
```

Editable:

```text
name
selectedEmployeeIds
```

Any changed Employee list must be revalidated.

Do not use this endpoint to change status.

For simplicity and auditability, changing Salary Structure or payroll period after Payrun creation is not allowed. Create a new DRAFT Payrun instead.

---

## 20.4 Delete Payrun

### `DELETE /payroll/payruns/:id`

Allowed only when:

```text
status = DRAFT
```

A `COMPUTED`, `VALIDATED`, or `PAID` Payrun should be preserved.

---

# 21. Compute Payrun

## `POST /payroll/payruns/:id/compute`

Allowed roles:

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Allowed current states:

```text
DRAFT
COMPUTED
```

`COMPUTED` allows correction + recomputation before validation.

Forbidden:

```text
VALIDATED
PAID
```

---

## 21.1 Computation Pipeline

For each selected Employee:

```text
Load Employee
      ↓
Ensure Employee ACTIVE
      ↓
Resolve exactly one applicable Contract
      ↓
Confirm Contract Salary Structure matches Payrun
      ↓
Load Working Schedule
      ↓
Load Attendance for period
      ↓
Load approved Time Off for period
      ↓
Load active Salary Rules by sequence ASC
      ↓
Execute safe calculations
      ↓
Build salary component snapshots
      ↓
Calculate Gross / Deductions / Net
      ↓
Create or update one Payslip for Employee + Payrun
      ↓
Record warnings/errors
```

---

## 21.2 Recompute Rule

Computation must be idempotent within the same Payrun.

Do not create duplicate Payslips on repeated Compute.

Use:

```text
Payrun + Employee
```

as the unique logical Payslip identity.

A recompute updates the existing pre-finalized Payslip snapshot.

---

## 21.3 Blocking Error Behavior

Examples:

```text
No applicable Contract
Multiple applicable Contracts
Duplicate payroll
Missing Salary Rule dependency
Salary calculation failure
Missing Net result
```

A blocking problem:

- is attached to the affected Employee/Payrun,
- prevents that Employee's payroll result from being finalized,
- prevents Payrun validation while unresolved.

The computation pass may still complete for other Employees so that reviewers can see all warnings/errors together.

After the computation pass:

```text
Payrun.status = COMPUTED
```

even when blocking Employee errors exist.

Validation is what refuses finalization while blocking errors remain.

---

## 21.4 Non-Blocking Warnings

Examples:

```text
PAY-012 → missing bank details
PAY-013 → attendance exception / missing checkout
manual attendance correction
suspicious overtime
```

These remain visible for reviewer attention but do not block Validate by default unless the agreed validation specification is later intentionally changed.

---

## 21.5 Compute Success

```json
{
  "data": {
    "id": "...",
    "status": "COMPUTED",
    "summary": {
      "selectedEmployees": 10,
      "computedPayslips": 9,
      "employeesWithBlockingErrors": 1,
      "warnings": 3
    },
    "issues": [
      {
        "employeeId": "...",
        "code": "PAY-012",
        "severity": "WARNING",
        "message": "Employee bank details are missing."
      }
    ]
  },
  "message": "Payroll computation completed."
}
```

---

# 22. Validate Payrun

## `POST /payroll/payruns/:id/validate`

Allowed roles:

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### Precondition

```text
Payrun.status = COMPUTED
```

### Backend validation

- Every selected Employee has a valid computed result.
- No blocking payroll errors remain.
- No duplicate Payslip/payroll conflict exists.
- Net result exists.
- Salary calculations are valid.

### Success

```text
Payrun: COMPUTED → VALIDATED
Payslips: COMPUTED → VALIDATED
```

Store:

```text
validatedBy
validatedAt
```

### Errors

```text
PAY-007 → blocking issues remain
PAY-011 → invalid current state
```

---

# 23. Mark Payrun Paid

## `POST /payroll/payruns/:id/mark-paid`

Allowed roles:

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

### Precondition

```text
Payrun.status = VALIDATED
```

### Success

```text
Payrun: VALIDATED → PAID
Payslips: VALIDATED → PAID
```

Store:

```text
paidBy
paidAt
```

### Important

This action records payment completion in PeoplePay360.

It does **not** initiate a bank/payment-gateway transaction.

### Error

```text
PAY-010
```

---

# 24. Send Payslips

## `POST /payroll/payruns/:id/send-payslips`

Allowed roles:

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Allowed Payrun states:

```text
VALIDATED
PAID
```

### Behavior

For every Payslip:

1. Verify Employee email.
2. Generate/use correct Payslip PDF.
3. Send that Employee only their own Payslip.
4. Record delivery outcome if implemented.
5. Continue processing other Employees if one email fails.

Email failure must **not** modify payroll calculation or historical state.

### Response

```json
{
  "data": {
    "payrunId": "...",
    "sent": 8,
    "failed": 2,
    "failures": [
      {
        "employeeId": "...",
        "message": "Employee email is missing."
      }
    ]
  }
}
```

---

# 25. Payslip API

Payslips are calculation outputs owned by the payroll engine.

The client must **not** directly create arbitrary salary results.

Creation and calculation updates occur through:

```text
Payrun Compute / Recompute
```

State changes occur through:

```text
Payrun Validate
Payrun Mark Paid
```

This prevents client-side salary manipulation.

---

## 25.1 List Payslips

### `GET /payroll/payslips`

**Access:**

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Query:

```text
payrunId
employeeId
status
from
to
page
limit
```

---

## 25.2 My Payslips

### `GET /payroll/payslips/me`

**Access:** `EMPLOYEE`

Returns only the authenticated Employee's Payslips that are safe for employee visibility.

For MVP:

```text
VALIDATED
PAID
```

Employee must never receive another Employee's Payslip.

---

## 25.3 Get Payslip

### `GET /payroll/payslips/:id`

Access:

- Payroll roles/Admin, or
- Employee when:
  - Payslip belongs to them, and
  - status is `VALIDATED` or `PAID`.

### Response includes

```text
Employee
Payrun
Period
Salary Structure
Worked Days
Unpaid Leave context
Salary component snapshots
Gross
Deductions
Net
Warnings
Status
```

---

## 25.4 Get Payrun Payslips

### `GET /payroll/payruns/:id/payslips`

**Access:** Payroll roles/Admin.

Used by the Payrun processing screen.

---

# 26. Payslip PDF API

## `GET /payroll/payslips/:id/pdf`

### Payroll Role Access

Payroll roles/Admin may generate PDF for:

```text
COMPUTED
VALIDATED
PAID
```

to support payroll review.

### Employee Access

Employee may generate PDF only when:

```text
Payslip belongs to them
AND
status is VALIDATED or PAID
```

### Behavior

PDF must use stored Payslip snapshot values.

It must not recalculate salary from today's Contract or Salary Rules.

### Failure

```text
PSL-005
```

Payroll history remains intact if PDF generation fails.

---

# 27. Payroll Dashboard API

## `GET /dashboard/payroll`

**Access:**

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

`HR_MANAGER` has no full Payroll Dashboard access in the MVP because that role has no payroll-feature access.

### Query

```text
from
to
departmentId
employeeType
```

### Response

```json
{
  "data": {
    "filters": {
      "from": "2026-09-01",
      "to": "2026-09-30",
      "departmentId": null,
      "employeeType": null
    },
    "kpis": {
      "totalNetSalaryPaid": 520000,
      "payslipsGenerated": 10,
      "averageNetSalary": 52000,
      "approvedTimeOff": 8,
      "attendanceHealth": 94.5
    },
    "salaryByDepartment": [
      {
        "departmentId": "...",
        "departmentName": "Engineering",
        "totalNetSalary": 300000
      }
    ],
    "monthlyNetSalaryTrend": [
      {
        "month": "2026-09",
        "totalNetSalary": 520000
      }
    ],
    "attendanceOverview": {
      "present": 120,
      "late": 8,
      "absent": 5,
      "overtime": 4,
      "missingCheckout": 2,
      "manualEdits": 3
    },
    "timeOffOverview": {
      "approved": 8,
      "pending": 2
    },
    "payrollWarnings": [],
    "departmentOverview": []
  }
}
```

### Rules

- All values must come from persisted system data.
- No static/fake KPI or chart data.
- Invalid filters return validation error rather than silently changing filter meaning.
- Payroll historical department grouping should prefer the Payslip/Contract snapshot where available.

Errors:

```text
RPT-001
RPT-002
RPT-003
```

---

# 28. Resource Ownership Rules

Backend authorization must check both:

```text
ROLE
+
RESOURCE OWNERSHIP
```

Employee self-service endpoints never accept another Employee's identifier as authoritative input.

Examples:

```text
GET /employees/me
GET /attendance/me
GET /time-off/allocations/me
GET /time-off/requests/me
GET /payroll/payslips/me
```

If an Employee requests:

```text
GET /payroll/payslips/:id
```

backend must verify:

```text
payslip.employee == authenticatedUser.employee
```

Otherwise:

```text
403
AUTH-003 / EMP-005 as applicable
```

---

# 29. API Permission Matrix

| Endpoint Area | Employee | HR Manager | Payroll User | Payroll Manager | Admin |
|---|---:|---:|---:|---:|---:|
| Auth / own session | Own | Own | Own | Own | Own |
| User management | — | — | — | — | Full |
| Employees | Own profile | CRUD | CRUD | CRUD | CRUD |
| Departments | — | Manage | Manage | Manage | Manage |
| Working Schedules | — | CRUD | CRUD | CRUD | CRUD |
| Contracts | — | CRUD | CRUD | CRUD | CRUD |
| Attendance | Own + Check In/Out | CRUD/Correct | CRUD/Correct | CRUD/Correct | Full |
| Time Off Types | Read | CRUD | CRUD | CRUD | CRUD |
| Allocations | Own Read | CRUD/Approve | CRUD/Approve | CRUD/Approve | Full |
| Leave Requests | Own C/R | Read/Approve/Refuse | Read/Approve/Refuse | Read/Approve/Refuse | Full |
| Salary Structure reference | — | Minimal lookup | Read | Full | Full |
| Salary Structures | — | — | Read | CRUD | CRUD |
| Salary Rules | — | — | Read | CRUD | CRUD |
| Payruns | — | — | Process | Full Process | Full |
| Payslips | Own finalized | — | Read/process via Payrun | Read/process via Payrun | Full |
| Payroll Dashboard | — | — | Read | Read | Read |

---

# 30. State-Transition Endpoints

These are the only normal API actions for changing major workflow states.

## Contract

```text
POST /contracts/:id/start
POST /contracts/:id/cancel
POST /contracts/:id/expire
```

## Leave Allocation

```text
POST /time-off/allocations/:id/approve
POST /time-off/allocations/:id/cancel
```

## Leave Request

```text
POST /time-off/requests/:id/approve
POST /time-off/requests/:id/refuse
```

## Payrun

```text
POST /payroll/payruns/:id/compute
POST /payroll/payruns/:id/validate
POST /payroll/payruns/:id/mark-paid
```

## Salary Configuration Lifecycle

```text
POST /payroll/structures/:id/activate
POST /payroll/structures/:id/deactivate

POST /payroll/rules/:id/activate
POST /payroll/rules/:id/deactivate
```

## User / Employee Lifecycle

```text
POST /users/:id/activate
POST /users/:id/deactivate

POST /employees/:id/activate
POST /employees/:id/deactivate
```

The frontend must not replace these with:

```text
PATCH { "status": "..." }
```

---

# 31. Canonical State Values Used by API

## User

```text
ACTIVE
INACTIVE
```

## Employee

```text
ACTIVE
INACTIVE
```

## Contract

```text
DRAFT
RUNNING
EXPIRED
CANCELLED
```

## Attendance

```text
OPEN
PRESENT
LATE
OVERTIME
ABSENT
MISSING_CHECKOUT
```

## Leave Allocation

```text
DRAFT
APPROVED
CANCELLED
```

## Leave Request

```text
PENDING
APPROVED
REFUSED
```

## Salary Structure

```text
ACTIVE
INACTIVE
```

Implementation may store this as an `active` boolean, but API semantics remain Active/Inactive.

## Salary Rule

```text
ACTIVE
INACTIVE
```

Implementation may store this as an `active` boolean.

## Payrun

```text
DRAFT
COMPUTED
VALIDATED
PAID
```

## Payslip

```text
DRAFT
COMPUTED
VALIDATED
PAID
```

---

# 32. Canonical Salary Configuration

## Categories

```text
BASIC
ALLOWANCE
GROSS
DEDUCTION
NET
```

## Calculation Types

```text
FIXED
PERCENTAGE
FORMULA
```

## Payroll Input

```text
CONTRACT_WAGE
```

is a base/input and is not a calculation type.

---

# 33. Historical Integrity Rules

The API must preserve historical payroll behavior.

After a Payrun is `PAID`:

```text
No recompute
No employee-list change
No Salary Structure change
No period change
No total manipulation
No normal deletion
```

Validated/paid Payslips must use their stored snapshots.

Changing later:

```text
Contract
Salary Structure
Salary Rule
Employee Department
Working Schedule
```

must not retroactively change historical Payslip results.

---

# 34. Critical Idempotency / Duplicate Rules

## Leave Approval

Calling Approve multiple times must not consume balance multiple times.

## Payrun Compute

Repeated Compute while `COMPUTED` must update/rebuild the pre-finalized employee Payslip rather than creating another Payslip for the same:

```text
payrunId + employeeId
```

## Mark Paid

Calling Mark Paid on a Payrun that is already `PAID` is rejected.

## User Bootstrap

Application startup must not create duplicate bootstrap Admin accounts.

---

# 35. Endpoints That Must Not Exist

Do not create APIs such as:

```text
POST /register-admin
POST /salary/calculate-hardcoded
PATCH /payruns/:id/status
PATCH /leave-requests/:id/status
PATCH /payslips/:id/netSalary
POST /payslips/manual
POST /execute-salary-code
POST /real-bank-transfer
```

Reasons:

- no public Admin registration,
- Salary Rules must drive salary computation,
- workflow states need business validation,
- Payslips must not be client-authored,
- arbitrary executable formulas are forbidden,
- real bank integration is outside project scope.

---

# 36. Minimal Endpoint Inventory

```text
AUTH
POST   /auth/login
GET    /auth/me
POST   /auth/change-password

USERS
GET    /users
POST   /users
GET    /users/:id
PATCH  /users/:id
PATCH  /users/:id/role
POST   /users/:id/activate
POST   /users/:id/deactivate
POST   /users/:id/reset-password

DEPARTMENTS
GET    /departments
POST   /departments
GET    /departments/:id
PATCH  /departments/:id
POST   /departments/:id/deactivate

WORKING SCHEDULES
GET    /working-schedules
POST   /working-schedules
GET    /working-schedules/:id
PATCH  /working-schedules/:id
POST   /working-schedules/:id/deactivate

EMPLOYEES
GET    /employees/me
GET    /employees
POST   /employees
GET    /employees/:id
PATCH  /employees/:id
POST   /employees/:id/activate
POST   /employees/:id/deactivate

CONTRACTS
GET    /contracts
POST   /contracts
GET    /contracts/:id
PATCH  /contracts/:id
POST   /contracts/:id/start
POST   /contracts/:id/cancel
DELETE /contracts/:id

REFERENCES
GET    /reference/salary-structures

ATTENDANCE
GET    /attendance/me
POST   /attendance/check-in
POST   /attendance/check-out
GET    /attendance
POST   /attendance
GET    /attendance/:id
PATCH  /attendance/:id

TIME OFF TYPES
GET    /time-off/types
POST   /time-off/types
GET    /time-off/types/:id
PATCH  /time-off/types/:id
POST   /time-off/types/:id/deactivate

ALLOCATIONS
GET    /time-off/allocations/me
GET    /time-off/allocations
POST   /time-off/allocations
GET    /time-off/allocations/:id
PATCH  /time-off/allocations/:id
POST   /time-off/allocations/:id/approve
POST   /time-off/allocations/:id/cancel
DELETE /time-off/allocations/:id

LEAVE REQUESTS
GET    /time-off/requests/me
GET    /time-off/requests
POST   /time-off/requests
GET    /time-off/requests/:id
POST   /time-off/requests/:id/approve
POST   /time-off/requests/:id/refuse

SALARY STRUCTURES
GET    /payroll/structures
POST   /payroll/structures
GET    /payroll/structures/:id
PATCH  /payroll/structures/:id
POST   /payroll/structures/:id/activate
POST   /payroll/structures/:id/deactivate
DELETE /payroll/structures/:id

SALARY RULES
GET    /payroll/rules
POST   /payroll/rules
GET    /payroll/rules/:id
PATCH  /payroll/rules/:id
POST   /payroll/rules/:id/activate
POST   /payroll/rules/:id/deactivate
DELETE /payroll/rules/:id

PAYRUNS
POST   /payroll/payruns/eligible-employees
POST   /payroll/payruns
GET    /payroll/payruns
GET    /payroll/payruns/:id
PATCH  /payroll/payruns/:id
DELETE /payroll/payruns/:id
POST   /payroll/payruns/:id/compute
POST   /payroll/payruns/:id/validate
POST   /payroll/payruns/:id/mark-paid
POST   /payroll/payruns/:id/send-payslips
GET    /payroll/payruns/:id/payslips

PAYSLIPS
GET    /payroll/payslips/me
GET    /payroll/payslips
GET    /payroll/payslips/:id
GET    /payroll/payslips/:id/pdf

DASHBOARD
GET    /dashboard/payroll
```

---

# 37. Implementation Dependency Order

Recommended API implementation order:

```text
1. Auth + User/RBAC
2. Departments + Working Schedules
3. Employees
4. Contracts
5. Attendance
6. Time Off Types
7. Allocations
8. Leave Requests
9. Salary Structures
10. Salary Rules
11. Payrun Eligibility
12. Payrun Create
13. Payrun Compute
14. Payslips
15. Validate / Mark Paid
16. PDF
17. Bulk Email
18. Dashboard
```

---

# 38. Final API Contract Rules for Coding Agents

Before implementing an endpoint:

1. Read this API specification.
2. Read the corresponding Business Rule and Validation/Error sections.
3. Use the canonical roles and statuses exactly.
4. Do not create alternate endpoints for an existing business action.
5. Do not allow arbitrary workflow-state PATCH operations.
6. Do not calculate salary in the frontend.
7. Do not hardcode Payslip values.
8. Do not return another Employee's private data to an Employee account.
9. Do not mutate PAID payroll history.
10. Do not invent new error IDs when an agreed error ID already exists.
11. Do not modify this API contract silently because implementation is inconvenient.
12. If implementation requires a contract change, stop and update the specification with team approval first.

---

# 39. Cross-Document Canonical Decisions Used by This API

The following decisions are treated as authoritative for implementation:

```text
Leave Request:
PENDING → APPROVED / REFUSED

Contract:
DRAFT → RUNNING → EXPIRED
DRAFT/RUNNING → CANCELLED

Payrun/Payslip:
DRAFT → COMPUTED → VALIDATED → PAID

Salary Calculation Types:
FIXED
PERCENTAGE
FORMULA

CONTRACT_WAGE:
input/base only, not a calculation type

Attendance Worked Time:
CheckOut - CheckIn

Working Schedule Expected Time:
EndTime - StartTime - Break

Overlapping PENDING/APPROVED Leave:
blocked

Insufficient allocated Leave:
request is rejected and approval re-checks balance

Missing Checkout / attendance exception:
non-blocking payroll warning by default

Salary Structure with no active Rules:
blocking for payroll computation

Salary Structure uniqueness:
code must be unique

Dashboard:
live database aggregation only

PDF / Bulk Email / Live Dashboard:
required project scope
```

---

# 40. Source-of-Truth Rule

This API specification does not replace business/domain documents.

Responsibility remains:

```text
USER-FLOWS
→ what the user/system workflow is

ROLES-PERMISSIONS
→ who may perform it

STATE-MACHINES
→ which transitions are legal

BUSINESS-RULES
→ what conditions/calculations apply

VALIDATION-ERROR-SPEC
→ which errors/warnings are produced

DATABASE-SPEC
→ how the data is persisted

API-SPEC
→ how clients invoke those approved behaviors
```

If any future contradiction is discovered, resolve the contradiction in the relevant source specification first, then update this API contract deliberately.
