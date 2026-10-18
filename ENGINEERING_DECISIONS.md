# Engineering Decisions

## 1. Authentication Strategy

### Decision
JWT authentication was used for securing API access.

### Reasoning
JWT is stateless, easy to use with APIs, and does not require server-side session storage.

### Tradeoff
Token revocation is harder than session-based authentication.

---

## 2. Team-Based Role Model

### Decision
A Membership table was used to connect users and teams while storing roles.

### Reasoning
A user can belong to multiple teams and have different roles in each team.

### Tradeoff
Additional joins are required when checking permissions.

---

## 3. Server-Side Authorization

### Decision
Authorization checks are performed on the backend.

### Reasoning
Frontend validation can be bypassed. Security must be enforced on the server.

### Tradeoff
Additional validation logic is required on protected APIs.

---

## 4. Activity History

### Decision
A separate ActivityEvent table was created.

### Reasoning
This provides an audit trail for important actions such as assignments, status changes, and comments.

### Tradeoff
Additional database storage is required.

---

## 5. Workflow Validation

### Decision
Workflow transitions are validated on the server.

### Reasoning
This prevents invalid states and ensures business rules are enforced.

### Supported Flow

OPEN
→ IN_PROGRESS
→ AWAITING_APPROVAL
→ RESOLVED
→ CLOSED

### Tradeoff
Additional validation logic is required.

---

## 6. Atomic Claim Operation

### Decision
Work item claiming was implemented as an atomic operation.

### Reasoning
Only one user can successfully claim an unassigned work item.

### Tradeoff
Implementation is more complex than a simple update.

---

## 7. Optimistic Locking

### Decision
A version field was added to work items.

### Reasoning
This prevents stale updates from overwriting newer changes.

### Tradeoff
Clients must send the current version during updates.

---

## 8. Database Choice

### Decision
SQLite with Prisma was selected.

### Reasoning
The assessment was completed on a managed company laptop with installation restrictions. SQLite enabled rapid local development and allowed focus on business requirements.

### Tradeoff
SQLite is not ideal for large-scale production systems.

---

## 9. Architecture

### Decision
The application follows a layered architecture.

Routes → Controllers → Services → Prisma

### Reasoning
This separation improves maintainability and testability.

### Tradeoff
More files and project structure are required.

---

## 10. Testing Strategy

### Decision
Automated tests were written for critical business rules.

### Areas Tested

- Authentication
- Authorization
- Workflow Validation
- Atomic Claim
- Optimistic Locking

### Reasoning
Business-critical behavior was prioritized over simple CRUD testing.
