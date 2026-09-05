# `01-USER-FLOWS.md`

## PeoplePay360 — User Flow Specification

**Document Type:** Functional Flow Specification
**Version:** 1.0
**Status:** Proposed for Team Review
**Project:** PeoplePay360 – HR & Payroll
**Purpose:** Define the approved end-to-end user journeys before database, API, frontend, or business-logic implementation.

---

## 1. Purpose

This document defines:

* who initiates each workflow,
* required preconditions,
* exact sequence of actions,
* system responsibilities,
* expected outcomes,
* important alternative/error paths.

All implementation teams must follow these flows.

**Business rules, API design, and database design may support these flows but must not redefine them.**

The source describes PeoplePay360 as one connected HR/payroll lifecycle where Employee, Contract, Working Schedule, Attendance, Time Off, Salary Structures, Salary Rules, Payruns and Payslips work together. 

---

## 2. Actors

| Actor                  | Primary Responsibilities                                                              |
| ---------------------- | ------------------------------------------------------------------------------------- |
| **Employee**           | View own profile, attendance and leave; create attendance and leave requests          |
| **HR Manager**         | Manage employees, contracts, schedules, attendance and time off; approve/refuse leave |
| **HR Payroll User**    | HR permissions + create/process Payruns and Payslips                                  |
| **HR Payroll Manager** | Full payroll processing + Salary Structure/Salary Rule management                     |
| **Admin**              | Full system access, user creation, roles and administration                           |

These roles and access boundaries are explicitly defined by the problem statement. 

---

## 3. Flow Conventions

### Flow ID

Every workflow has a unique identifier:

```text
AUTH-01
EMP-01
CON-01
ATT-01
TMO-01
PAY-01
```

### Flow Structure

Each flow defines:

```text
Actor
Trigger
Preconditions
Main Flow
Alternative / Error Flow
Postconditions
```

### Important Rule

Frontend behavior does **not** define business success.

Example:

```text
Button says "Approved"
```

does not mean leave is approved.

The backend business operation must successfully complete first.

---

## 4. High-Level System Flow

```text
Authentication
      ↓
Employee Master
      ↓
Contract + Working Schedule
      ↓
Attendance + Time Off
      ↓
Salary Configuration
      ↓
Payrun Creation
      ↓
Payroll Computation
      ↓
Validation
      ↓
Payslip
      ↓
Mark Paid
      ↓
PDF / Email
      ↓
Dashboard / History
```

---

## 5. Authentication & Access Flows

### AUTH-01 — User Login

**Primary Actor:** Any registered user

#### Preconditions

* User account exists.
* User is active.
* User has at least one valid role.

#### Main Flow

1. User opens Login page.
2. User enters email and password.
3. System validates credentials.
4. System identifies assigned role(s).
5. System creates authenticated session/token.
6. User is redirected to the appropriate application area.
7. Navigation and actions are shown according to permissions.

#### Error Flows

```text
Invalid email/password
→ Reject login

Inactive user
→ Reject login

Missing role
→ Reject protected access
```

#### Postcondition

User has an authenticated session with role-based permissions.

---

## 6. Employee Management Flows

### EMP-01 — Create Employee

**Primary Actor:** HR Manager / Payroll-authorized user / Admin

#### Preconditions

* User is authenticated.
* User has employee-management permission.

#### Main Flow

1. User opens **Employees**.
2. User selects **New Employee**.
3. User enters employee information.
4. User selects applicable:

   * department,
   * job position,
   * manager,
   * employee type,
   * working schedule.
5. User saves Employee.
6. System validates required Employee information and department, working-schedule and manager relationships.
7. System ensures the Employee email is unique and is not occupied by an incompatible User.
8. System securely generates a temporary password and provisions an `ACTIVE` User with role `EMPLOYEE` and `mustChangePassword = true`.
9. System creates the Employee record and establishes the reciprocal `Employee.user` / `User.employeeId` relationship.
10. System returns the Employee plus the one-time onboarding credential.
11. Employee appears in List/Kanban view.

#### Error / Rollback Flow

If User provisioning, Employee creation, or reciprocal linkage fails, the system rolls back or compensates records created by this onboarding attempt. It must not leave an orphan User, an orphan Employee, or a half-linked relationship.

#### Postcondition

Employee becomes available for contracts, attendance, time off and payroll-related workflows and can sign in using the one-time temporary credential.

The source identifies Employee as the operational hub and requires list/Kanban/form navigation. 

---

### EMP-02 — View Employee Details

**Actor:** Authorized HR/Payroll user

#### Main Flow

1. User opens Employee List/Kanban.
2. User selects an Employee.
3. System opens Employee Form.
4. System displays employee details.
5. System displays access to related records:

```text
Contracts
Attendance
Time Off
Allocations
```

6. Selecting a related section opens records filtered to that Employee.

#### Postcondition

User can inspect the Employee's complete HR context without manually searching each module.

---

## 7. Contract Management Flows

### CON-01 — Create Employee Contract

**Primary Actor:** HR Manager / Authorized HR user

#### Preconditions

* Employee exists.

#### Main Flow

1. Open Employee.
2. Select **Contracts**.
3. Select **New Contract**.
4. Enter:

   * start date,
   * end date if applicable,
   * wage,
   * department,
   * position,
   * salary structure,
   * status.
5. System checks contract validity.
6. System checks for conflicting applicable contracts.
7. If valid, Contract is saved.
8. Contract becomes part of Employee's contract history.

#### Error Flow

```text
Contract conflicts with another
applicable active contract
        ↓
Reject save
        ↓
Show conflict validation message
```

#### Postcondition

Employee has a valid historical Contract record.

The system must preserve contract history while ensuring payroll uses the correct period-specific contract. 

---

### CON-02 — Payroll Contract Resolution

**Primary Actor:** System

**Trigger:** Payroll computation.

#### Main Flow

1. Receive Employee and Payrun period.
2. Retrieve Employee contracts.
3. Determine which Contract applies to the payroll period.
4. Verify that exactly one valid Contract is applicable.
5. Use its wage, position, salary structure/context and other relevant terms for payroll.

#### Error Flows

```text
No applicable Contract
→ Payroll warning/error

Multiple applicable Contracts
→ Payroll blocking error
```

#### Postcondition

Payroll computation uses the correct historical employment terms.

---

## 8. Working Schedule Flows

### SCH-01 — Create Working Schedule

**Primary Actor:** HR Manager / Admin

#### Main Flow

1. Open Working Schedules.
2. Select **New**.
3. Enter schedule name/type.
4. Define weekly schedule lines:

```text
Day
Start Time
End Time
Break
```

5. System calculates hours for each schedule line.
6. System calculates total weekly hours.
7. User saves schedule.

#### Postcondition

Working Schedule becomes available for assignment.

Weekly hours must be calculated from the configured schedule rather than manually entered. 

---

### SCH-02 — Assign Working Schedule

#### Main Flow

1. HR opens Employee/Contract.
2. Selects Working Schedule.
3. Saves record.
4. System associates the schedule with the employee's working context.

#### Postcondition

The system has a defined expected working pattern for attendance/payroll context.

---

## 9. Attendance Flows

### ATT-01 — Employee Check-In

**Primary Actor:** Employee

#### Preconditions

* Employee is authenticated.
* Employee does not already have an open attendance session.

#### Main Flow

1. Employee selects **Check In**.
2. System records current check-in timestamp.
3. Attendance record becomes active/open.
4. UI displays active attendance state.

#### Error Flow

```text
Existing open attendance
→ Reject duplicate Check-In
```

---

### ATT-02 — Employee Check-Out

#### Preconditions

* Employee has an active Check-In record.

#### Main Flow

1. Employee selects **Check Out**.
2. System records checkout timestamp.
3. System calculates worked hours.
4. Attendance status is determined.
5. Completed attendance entry is stored.

#### Error Flow

```text
No active Check-In
→ Reject Check-Out
```

---

### ATT-03 — HR Attendance Correction

**Primary Actor:** Authorized HR user

#### Main Flow

1. HR opens Attendance record.
2. HR edits incorrect check-in/check-out information.
3. System validates timestamps.
4. System recalculates worked hours.
5. Updated attendance is stored.

#### Postcondition

Corrected attendance remains available for payroll/reporting.

Manual corrections must be restricted to authorized users. 

---

## 10. Time Off Flows

Time Off contains three related functional areas:

```text
Time Off Types
      ↓
Allocations
      ↓
Requests
```

---

### TMO-01 — Configure Time Off Type

**Actor:** HR Manager / Admin

#### Main Flow

1. Open Time Off Types.
2. Create type.
3. Configure:

   * name,
   * unit,
   * allocation requirement,
   * approval behavior,
   * payroll relevance/status.
4. Save.

#### Postcondition

Time Off Type becomes available for allocations and requests.

---

### TMO-02 — Allocate Leave

**Actor:** HR Manager

#### Preconditions

* Employee exists.
* Time Off Type exists.

#### Main Flow

1. HR opens Allocations.
2. Selects Employee.
3. Selects Time Off Type.
4. Enters allocated quantity and validity period.
5. Allocation is submitted/approved according to the workflow.
6. System stores available leave allocation.

#### Derived values

```text
Remaining
=
Allocated - Consumed
```

The source requires allocation tracking including taken and remaining balances. 

---

### TMO-03 — Employee Requests Time Off

**Actor:** Employee

#### Preconditions

* Employee exists.
* Requested Time Off Type exists.

#### Main Flow

1. Employee opens **Time Off → Requests**.
2. Selects **New Request**.
3. Selects Time Off Type.
4. Enters start/end dates or duration.
5. System calculates requested duration.
6. If allocation is required, system verifies available balance.
7. Request is created with:

```text
PENDING
```

8. HR receives/views pending request.

#### Error Flow

```text
Requires Allocation
AND
Available Balance < Requested Duration

→ Reject request
```

---

### TMO-04 — Approve Time Off

**Actor:** HR Manager

#### Preconditions

* Request status = `PENDING`.

#### Main Flow

1. HR opens request.
2. Reviews request.
3. Selects **Approve**.
4. System verifies allocation again.
5. System updates request to `APPROVED`.
6. Applicable allocation is consumed.
7. Remaining balance is recalculated.

#### Postcondition

Approved leave is reflected in employee leave data and reporting.

Approved requests must deduct from the employee's allocated balance. 

---

### TMO-05 — Refuse Time Off

#### Main Flow

1. HR opens pending request.
2. Selects **Refuse**.
3. Request becomes `REFUSED`.
4. Leave allocation remains unchanged.

---

## 11. Salary Configuration Flows

### SAL-01 — Create Salary Structure

**Actor:** Payroll Manager / Admin

#### Main Flow

1. Open Salary Structures.
2. Create structure.
3. Enter structure details.
4. Associate required Salary Rules.
5. Configure rule execution order.
6. Activate structure.

#### Postcondition

Salary Structure becomes available for Contract/Payrun configuration.

The structure selected for payroll determines the rules used in computation. 

---

### SAL-02 — Create Salary Rule

**Actor:** Payroll Manager / Admin

#### Main Flow

1. Open Salary Rules.
2. Create rule.
3. Define:

   * Name
   * Code
   * Category
   * Sequence
   * Computation Method
   * Computation configuration
4. Associate rule with Salary Structure.
5. Save.

#### Supported Calculation Types

For our implementation:

```text
FIXED
PERCENTAGE
FORMULA
```

#### Postcondition

Rule becomes part of payroll computation.

Rules must be executed in defined sequence because later values may depend on earlier results. 

---

## 12. Payrun Creation Flow

### PAY-01 — Start New Payrun

**Primary Actor:** Payroll User / Payroll Manager

#### Important Requirement

Creating a Payrun is a **two-step workflow**. 

---

#### Step 1 — Define Payrun Scope

1. User selects **New Payrun**.
2. System opens setup wizard.
3. User selects:

   * Salary Structure
   * Period
   * Employee Type / applicable scope
4. User selects **Continue**.
5. System validates the configuration.
6. **No Payrun is created yet.**

---

#### Step 2 — Employee Selection

7. System determines candidate/eligible employees.
8. User sees Employee list.
9. User explicitly selects employees:

```text
☑ Employee A
☑ Employee B
☐ Employee C
```

10. User selects **Create Payrun**.
11. System creates Payrun containing only selected Employees.
12. Payrun initially enters:

```text
DRAFT
```

#### Postcondition

A Payroll batch exists for the selected period, structure and employees.

---

## 13. Payroll Computation Flow

### PAY-02 — Compute Payrun

**Primary Actor:** Payroll User / Payroll Manager

#### Preconditions

```text
Payrun Status = DRAFT
```

#### Main Flow

For each selected Employee:

1. Retrieve Employee data.
2. Resolve Contract applicable to Payrun period.
3. Retrieve selected Salary Structure.
4. Retrieve active Salary Rules.
5. Order rules by sequence.
6. Retrieve relevant attendance/time-off context.
7. Execute salary calculations.
8. Build salary components.
9. Calculate:

```text
Basic
Allowances
Gross
Deductions
Net
```

10. Run payroll validations.
11. Generate Payslip.
12. Record applicable warnings.

After all eligible employees are processed:

13. Payrun becomes:

```text
COMPUTED
```

The source explicitly requires payslips to use the applicable contract and assigned Salary Structure. 

---

## 14. Payroll Warning Flow

### PAY-03 — Review Payroll Warnings

**Actor:** Payroll User / Payroll Manager

#### Example Conditions

```text
Missing active Contract
Duplicate Payslip
Missing bank details
Missing Salary Structure
Incomplete required employee information
Invalid payroll configuration
```

#### Main Flow

1. Compute operation detects problem.
2. System attaches warning/error to Employee/Payslip.
3. Payrun displays warning summary.
4. User opens affected record.
5. User corrects underlying data where necessary.
6. User recomputes payroll if required.

The problem statement explicitly requires warnings before payroll finalization. 

---

## 15. Payrun Validation Flow

### PAY-04 — Validate Payrun

**Actor:** Payroll User / Payroll Manager

#### Preconditions

```text
Payrun Status = COMPUTED
```

#### Main Flow

1. User selects **Validate**.
2. System checks all Payslips.
3. System checks blocking payroll errors.
4. If no blocking error exists:

   * Payslips are finalized,
   * Payrun becomes `VALIDATED`.

#### Error Flow

```text
Blocking Error exists
        ↓
Validation rejected
        ↓
User must resolve problem
```

#### Postcondition

Validated payroll is ready to be marked paid.

---

## 16. Payment Status Flow

### PAY-05 — Mark Payrun Paid

**Actor:** Payroll User / Payroll Manager

#### Preconditions

```text
Payrun Status = VALIDATED
```

#### Main Flow

1. User selects **Mark Paid**.
2. System verifies Payrun state.
3. System changes Payrun/Payslip payment state to `PAID`.
4. Payroll is preserved as historical information.

#### Important Scope Boundary

**No real banking transaction occurs.**

`Mark Paid` records the payroll payment status in the HRMS.

The source requires a payment status/history workflow, not an external banking integration. 

---

## 17. Payslip Flow

### PSL-01 — View Payslip

**Actor:** Payroll-authorized user / respective Employee where permitted

#### Main Flow

1. Open Payslip.
2. System displays:

   * Employee
   * Payroll Period
   * Payrun
   * Salary Structure
   * Status
   * Worked Days
   * Basic
   * Allowances
   * Gross
   * Deductions
   * Net Salary.

The PS requires a detailed salary-rule breakdown. 

---

### PSL-02 — Generate Payslip PDF

#### Main Flow

1. User selects **Print Payslip**.
2. System uses stored Payslip calculation.
3. System generates printable PDF.
4. PDF is returned/downloaded.

---

### PSL-03 — Send Payslips

**Actor:** Payroll User / Payroll Manager

#### Main Flow

1. Open Payrun.
2. Select **Send Payslips**.
3. System identifies Payslips and associated Employees.
4. System generates/uses Payslip PDFs.
5. System sends each Payslip to the corresponding employee email.
6. System reports successful/failed deliveries.

PDF generation and bulk delivery are explicitly part of the required workflow. 

---

## 18. Dashboard Flow

### DSH-01 — View Payroll Dashboard

**Actor:** Authorized HR/Payroll user

#### Main Flow

1. User opens Payroll Dashboard.
2. System reads actual HR/payroll records.
3. System aggregates:

```text
Employees
Contracts
Attendance
Time Off
Payruns
Payslips
```

4. System displays KPIs.
5. User may filter by:

   * Period
   * Department
   * Employee Type.
6. System recalculates dashboard data using filters.

#### Expected Outputs

```text
Total Net Salary
Payslips Generated
Average Salary
Payroll Status
Approved Time Off
Attendance Health

Salary Cost by Department
Monthly Net Salary Trend
Attendance Overview
Time Off Overview
Payroll Warnings
Department Breakdown
```

The source requires live aggregated dashboard information rather than static values. 

---

## 19. Two Mandatory Demo Flows

These should eventually become your final acceptance scenarios.

### Demo Flow A — Employee to Payslip

```text
Employee
→ Contract
→ Working Schedule
→ Attendance
→ Salary Structure
→ Payrun Wizard
→ Employee Selection
→ Compute
→ Payslip
→ Validate
→ Mark Paid
→ PDF
```

### Demo Flow B — Leave Lifecycle

```text
Employee
→ Leave Allocation
→ Leave Request
→ HR Approval
→ Balance Reduction
→ Dashboard/Employee record reflects change
```

The problem statement expects two complete scenarios such as employee-to-payslip and leave allocation-to-request. 

---

