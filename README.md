# SETU

### Shared Engineering Team Unified

SETU is a full-stack MERN collaboration platform designed to help software development teams manage organizations, projects, team members, tasks, and engineering workflows from a single platform.

The project is being developed phase-by-phase with a focus on clean architecture, authentication, authorization, scalability, project isolation, and practical full-stack development.

---

## 🚀 Project Status

| Phase | Status |
|---|---|
| Phase 1 — Project Foundation | ✅ Completed |
| Phase 2 — Authentication | ✅ Completed |
| Phase 3 — Organization & Team Management | ✅ Completed |
| Phase 4 — Project Management | ✅ Completed |
| Phase 5 — Task Management & Kanban | ⏳ Upcoming |

---

# 🧭 Development Roadmap

## Phase 1 — Project Foundation ✅

Established the basic MERN application architecture.

### Completed

- MERN project structure
- React + Vite frontend
- Node.js + Express backend
- MongoDB + Mongoose integration
- Environment configuration
- Express middleware structure
- Error handling
- API health check
- Git/GitHub setup
- Development environment configuration

---

# Phase 2 — Authentication ✅

Implemented secure user authentication and protected application access.

### Completed

- User registration and login
- Password hashing using bcryptjs
- JWT-based authentication
- Protected API routes
- Authentication middleware
- Frontend authentication context
- Protected frontend routes
- Axios authentication handling
- Persistent user authentication
- Dashboard authentication flow


# Phase 3 — Organization & Team Management ✅

Implemented organization management, team membership, and role-based access control.

### Completed

- Organization creation and management
- Organization membership
- Multiple organizations per user
- Team member management
- Role assignment and management
- Role-based access control (RBAC)
- Owner, Admin, Manager, Developer, QA, and Viewer roles
- Organization-level authorization
- Organization data isolation
- Organization management UI
- Organization switching
- Role-based frontend controls


# Phase 4 — Project Management ✅

Implemented project management, project access control, project membership, and project collaboration foundations.

### Completed

- Project creation and management
- Project retrieval and updating
- Project archive and restore
- Project access control
- Project membership management
- Organization-based project isolation
- Project dashboard foundation
- Project member management
- Project management UI
- Project dashboard UI
- Project permission-based controls
- Organization-to-project integration
### Authentication Flow
User
 │
 ├── Register
 │      ↓
 │   Password Hashing
 │      ↓
 │   User Stored in MongoDB
 │
 └── Login
        ↓
     JWT Token
        ↓
   Frontend Storage
        ↓
 Authorization Header
        ↓
  Protected API
        ↓
 Authentication
        ↓
 Organization Membership
        ↓
   RBAC / Permissions
        ↓
   Project Access
        ↓
 Project Membership
        ↓
 Project Resources