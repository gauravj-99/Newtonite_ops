# Newtonite Ops

Newtonite Ops is an internal operations management system built to manage work items across multiple teams while enforcing authorization, workflow validation, activity history, and concurrency protection.

---

## Features

### Authentication

- JWT authentication
- Protected API routes
- Password hashing with bcrypt
- Logged-in user endpoint

### Team & Role Management

Roles supported:

- VIEWER
- MEMBER
- LEAD
- ADMIN

Features:

- Team based access control
- Team scoped permissions
- Role validation

### Work Item Management

- Create work items
- View work items
- Update work items
- Search work items
- Pagination
- Filter by status
- Filter by priority
- Filter by assignee

### Workflow Management

Supported workflow:

OPEN
→ IN_PROGRESS
→ AWAITING_APPROVAL
→ RESOLVED
→ CLOSED

Only LEAD users can approve items.

### Activity History

Tracks:

- Work item creation
- Assignment changes
- Status changes
- Priority changes
- Comments

### Concurrency Protection

- Atomic claim operation
- Optimistic locking using version field
- HTTP 409 conflict handling

---

## Tech Stack

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- SQLite
- JWT
- bcrypt

### Frontend

- React
- TypeScript
- Tailwind CSS
- Axios
- React Router

### Testing

- Jest
- Supertest

---

## Project Structure

```text
newtonite-ops

├── backend
│   ├── prisma
│   ├── src
│   │   ├── config
│   │   ├── controllers
│   │   ├── middleware
│   │   ├── routes
│   │   ├── services
│   │   └── types
│
├── frontend
│   ├── src
│   │   ├── pages
│   │   ├── components
│   │   ├── api
│   │   └── hooks
│
├── README.md
├── ENGINEERING_DECISIONS.md
└── .gitignore
```

---

## Setup

### Clone Repository

```bash
git clone <repository-url>
cd newtonite-ops
```

---

## Backend Setup

```bash
cd backend

copy .env.example .env

npm install

npx prisma db push

npm run seed

npm run dev
```

Backend URL:

```text
http://localhost:5000
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

## Test Accounts

### Admin

```text
Email: admin@test.com
Password: Password123
```

### Lead

```text
Email: lead@test.com
Password: Password123
```

### Member

```text
Email: member@test.com
Password: Password123
```

---

## Running Tests

```bash
cd backend

npm test
```

---

## API Endpoints

### Authentication

```http
POST /api/auth/login

GET /api/users/me
```

### Work Items

```http
GET /api/work/teams/:teamId/items

POST /api/work/teams/:teamId/items

GET /api/work/items/:workItemId

PATCH /api/work/items/:workItemId

PATCH /api/work/items/:workItemId/status

PATCH /api/work/items/:workItemId/approve

POST /api/work-items/:id/claim

GET /api/work/items/:workItemId/activity

POST /api/work/items/:workItemId/comments
```

---

## Key Engineering Features

### Team Based Authorization

Users can only access work items belonging to teams they are members of.

### Workflow Validation

The backend validates all workflow transitions and rejects invalid state changes.

### Activity Audit Trail

Important actions are stored in ActivityEvent records to provide transparency and accountability.

### Optimistic Locking

Work items use a version field to prevent stale updates from overwriting newer data.

### Atomic Claim

Only one user can successfully claim an unassigned work item.

---

## Automated Test Coverage

The backend test suite covers:

- Authentication
- Authorization
- Workflow validation
- Atomic claim handling
- Optimistic locking

---

## Known Limitations

The following items were intentionally left out due to assessment scope:

- User registration
- Team management UI
- Refresh token implementation
- File attachments
- Real-time notifications
- Production deployment configuration

---

## Future Improvements

- User management dashboard
- Team administration
- Email notifications
- Refresh token support
- File uploads
- Reporting and analytics
- Real-time updates using WebSockets

---

## Engineering Decisions

A detailed explanation of architectural and implementation decisions is available in:

```text
ENGINEERING_DECISIONS.md
```
