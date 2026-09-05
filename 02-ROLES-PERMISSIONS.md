# `02-ROLES-PERMISSIONS.md`

## PeoplePay360 — Role & Permission Specification

**Document Type:** Access Control Specification
**Version:** 1.0
**Status:** Proposed for Team Review
**Project:** PeoplePay360 – HR & Payroll

---

## 1. Purpose

This document defines **what each user role is allowed to view and perform**.

These permissions must be enforced in **both places**:

```text
Frontend
→ hide/disable unavailable actions

Backend
→ actually reject unauthorized requests
```

Frontend hiding alone is **not security**.

The problem statement defines five roles with progressively broader HR and Payroll permissions. 

---

## 2. Defined Roles

### R1 — Employee

Employee can manage/view only their own HR information.

Allowed:

* View own employee profile
* View own attendance
* Check in / check out
* View own leave balance
* Create own Time Off Request
* View own approved/refused requests
* View own Payslips when available

Not allowed:

* Manage Employees
* Edit Contracts
* Approve leave
* Access Payruns
* Configure Salary Rules
* Manage users/roles

The source explicitly states that Employees may view their own records and create attendance/time-off records but have no HR/payroll administration access. 

---

### R2 — HR Manager

HR Manager manages operational HR.

Allowed:

```text
Employees
Contracts
Working Schedules
Attendance
Time Off
```

Can:

* Create/update employee records
* Manage contracts
* Manage working schedules
* Review/correct attendance
* Configure Time Off Types
* Manage allocations
* Approve/refuse Time Off Requests
* View HR-related dashboards/data

Not allowed:

```text
Payrun processing
Payslip processing
Salary Structure editing
Salary Rule editing
Mark payroll paid
```

The problem statement explicitly says the HR Manager has full CRUD on HR modules but **no payroll-feature access**. 

---

### R3 — HR Payroll User

This role inherits HR Manager capabilities and additionally handles payroll operations.

Allowed:

```text
All HR Manager permissions
+
Payruns
Payslips
```

Can:

* Create Payruns
* Select employees for Payrun
* Compute payroll
* Review Payslips
* Validate payroll
* Mark Payrun paid
* Send Payslips
* Read Salary Structures
* Read Salary Rules

Cannot:

* Create/edit/delete Salary Structures
* Create/edit/delete Salary Rules
* Manage system users/roles

This follows the source definition: HR Payroll User has HR Manager permissions plus Create/Read/Update access to Payruns and Payslips, with read-only access to salary structures and rules. 

---

### R4 — HR Payroll Manager

Payroll Manager has full HR + Payroll authority.

Allowed:

```text
Employees
Contracts
Schedules
Attendance
Time Off
Salary Structures
Salary Rules
Payruns
Payslips
Payroll Dashboard
```

Can additionally:

* Create Salary Structures
* Edit Salary Structures
* Archive/deactivate Salary Structures
* Create Salary Rules
* Edit Salary Rules
* Configure rule sequence
* Configure rule calculation method
* Control full payroll processing

The source grants full CRUD across Payruns, Payslips, Salary Structures and Salary Rules. 

---

### R5 — Admin

Admin has full access across the entire platform.

Can:

* Perform all HR Manager actions
* Perform all Payroll Manager actions
* Create users
* Assign roles
* Modify user permissions
* Activate/deactivate users
* Access all modules
* Perform system administration

The problem statement explicitly gives Admin full access to all modules/models and responsibility for user management and role assignment. 

---

## 3. Permission Matrix

Legend:

```text
V = View
C = Create
U = Update
D = Delete/Archive
A = Approve / Business Action
— = No Access
OWN = Own records only
```

| Module             | Employee | HR Manager              | Payroll User | Payroll Manager | Admin |
| ------------------ | -------- | ----------------------- | ------------ | --------------- | ----- |
| Own Profile        | V        | V/U                     | V/U          | V/U             | Full  |
| Employees          | OWN      | CRUD                    | CRUD         | CRUD            | CRUD  |
| Contracts          | —        | CRUD                    | CRUD         | CRUD            | CRUD  |
| Working Schedules  | —        | CRUD                    | CRUD         | CRUD            | CRUD  |
| Own Attendance     | V/C      | V/U                     | V/U          | V/U             | Full  |
| All Attendance     | —        | CRUD                    | CRUD         | CRUD            | CRUD  |
| Time Off Types     | V        | CRUD                    | CRUD         | CRUD            | CRUD  |
| Own Leave Balance  | V        | V                       | V            | V               | V     |
| Leave Allocations  | OWN-V    | CRUD                    | CRUD         | CRUD            | CRUD  |
| Own Leave Requests | C/V      | V/A                     | V/A          | V/A             | Full  |
| All Leave Requests | —        | V/A                     | V/A          | V/A             | Full  |
| Salary Structures  | —        | —                       | V            | CRUD            | CRUD  |
| Salary Rules       | —        | —                       | V            | CRUD            | CRUD  |
| Payruns            | —        | —                       | C/V/U/A      | CRUD/A          | Full  |
| Payslips           | OWN-V    | —                       | C/V/U        | CRUD            | Full  |
| Payroll Dashboard  | —        | HR-only view if exposed | V            | V               | V     |
| User Management    | —        | —                       | —            | —               | CRUD  |
| Role Assignment    | —        | —                       | —            | —               | A     |

---

## 4. Action-Level Permission Rules

### EMPLOYEE ACTIONS

#### Create Employee

Allowed:

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Not allowed:

```text
EMPLOYEE
```

---

#### Edit Employee

Same as Create Employee.

Employees should not freely modify protected employment information such as:

```text
wage
department
manager
contract
salary structure
```

---

## 5. Contract Actions

### Create/Edit Contract

Allowed:

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Employee:

```text
NO
```

Payroll computation may **read** contracts but employees cannot alter them.

---

## 6. Attendance Actions

### Check In / Check Out

Employee:

```text
OWN RECORD ONLY
```

Authorized HR users may also create/manage attendance where required.

### Manual Attendance Correction

Allowed:

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Employee:

```text
NO
```

The source specifically restricts manual corrections to authorized users. 

---

## 7. Time Off Actions

### Create Time Off Request

Employee:

```text
OWN REQUEST
```

Authorized HR users may create/manage requests where needed.

### Approve / Refuse Request

Allowed:

```text
HR_MANAGER
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Employee cannot approve their own request.

---

## 8. Salary Configuration Permissions

### Salary Structure

```text
Employee              NO ACCESS
HR Manager            NO ACCESS
Payroll User          READ ONLY
Payroll Manager       FULL CRUD
Admin                 FULL CRUD
```

### Salary Rule

Same permissions.

This distinction is explicitly required by the problem statement. 

---

## 9. Payrun Permissions

### Create Payrun

Allowed:

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

---

### Compute Payrun

Allowed:

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Precondition:

```text
status = DRAFT
```

---

### Validate Payrun

Allowed:

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Precondition:

```text
status = COMPUTED
```

---

### Mark Paid

Allowed:

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

Precondition:

```text
status = VALIDATED
```

---

### Send Payslips

Allowed:

```text
HR_PAYROLL_USER
HR_PAYROLL_MANAGER
ADMIN
```

The required Payrun actions include Compute, Validate, Mark Paid and Send Payslips. 

---

## 10. Payslip Access

### Employee

Can view:

```text
ONLY own Payslips
```

Cannot view another employee's Payslip.

---

### Payroll Roles

Can view Payslips within their authorized organization scope.

For hackathon MVP:

```text
all organization employees
```

unless we later introduce department/company scoping.

---

## 11. Data Ownership Rule

Backend must always distinguish:

```text
ROLE PERMISSION
        +
RESOURCE OWNERSHIP
```

Example:

Employee requests:

```text
GET /payslips/123
```

Backend must check:

```text
Is this Payslip.employeeId
equal to authenticated user's employeeId?
```

If not:

```text
403 FORBIDDEN
```

Do not rely on the fact that the UI does not show the link.

---

## 12. Role Hierarchy

Conceptually:

```text
              ADMIN
                ↑
      HR PAYROLL MANAGER
                ↑
        HR PAYROLL USER
                ↑
          HR MANAGER
```

But **Employee is not simply below HR Manager**.

Employee has special self-service permissions such as:

```text
own check-in
own leave request
own payslip
```

Therefore implement explicit permissions rather than blindly assuming role inheritance everywhere.

---

## 13. Backend Enforcement Rule

Every protected backend action should conceptually execute:

```text
Request
   ↓
Authenticate User
   ↓
Check Required Role/Permission
   ↓
Check Resource Ownership if required
   ↓
Validate Business Preconditions
   ↓
Execute Service
```

Example:

```text
Employee attempts:

POST /payruns

Authenticated? YES

Role allowed?
EMPLOYEE → NO

Result:
403 FORBIDDEN
```

---

## 14. Frontend Permission Rule

The frontend should use the same permission definitions.

Example:

Employee navigation:

```text
My Profile
Attendance
Time Off
Payslips
```

HR Manager:

```text
Employees
Contracts
Attendance
Time Off
Reports
```

Payroll User:

```text
Employees
Contracts
Attendance
Time Off
Payroll
Reports
```

Payroll Manager:

```text
Employees
Contracts
Attendance
Time Off
Payroll
Configuration
Reports
```

Admin:

```text
Everything
+
Users
+
Role Management
```

---

## 15. Forbidden Actions

Regardless of frontend:

### Employee cannot

```text
approve their own leave
edit salary rules
edit their contract
create payrun
view someone else's payslip
assign themselves a role
```

### HR Manager cannot

```text
process payroll
change salary structures
change salary rules
mark Payrun paid
```

### Payroll User cannot

```text
modify Salary Rules
modify Salary Structures
manage system roles
```

### Payroll Manager cannot

```text
grant themselves Admin privileges
```

Only Admin manages users and roles.

---

## 16. Security Decisions

For hackathon implementation:

### Authentication

```text
JWT-based authentication
```

### Authorization

```text
Backend RBAC middleware
+
ownership checks
```

### Passwords

Must be stored:

```text
hashed
```

Never plaintext.

### Role values

Freeze:

```text
EMPLOYEE

HR_MANAGER

HR_PAYROLL_USER

HR_PAYROLL_MANAGER

ADMIN
```

Do not allow developers to create variants like:

```text
PAYROLL_ADMIN
SUPER_ADMIN
HR_USER
MANAGER
```

unless the team formally updates this specification.

---

## 17. Permission Failure Responses

Use:

```text
401 UNAUTHORIZED
```

when:

```text
not authenticated
invalid/expired token
```

Use:

```text
403 FORBIDDEN
```

when:

```text
authenticated
but permission is insufficient
```

Example:

```text
Employee attempts to create Salary Rule

→ 403 FORBIDDEN
```

