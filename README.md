# SETU

### Shared Engineering Team Unified

SETU is a full-stack MERN collaboration platform designed to help software development teams manage organizations, projects, team members, tasks, collaboration, and engineering workflows from a single platform.

The project is being developed phase-by-phase with a focus on clean architecture, authentication, authorization, scalability, project isolation, collaboration, testing, and practical full-stack development.

---

## 🚀 Project Status

| Phase | Status |
|---|---|
| Phase 1 — Project Foundation | ✅ Completed |
| Phase 2 — Authentication | ✅ Completed |
| Phase 3 — Organization & Team Management | ✅ Completed |
| Phase 4 — Project Management | ✅ Completed |
| Phase 5 — Task Management & Kanban | ✅ Completed |
| Phase 6 — Collaboration | ✅ Completed |
| Phase 7 — Integration, Testing & Hardening | ✅ Completed |

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

## Phase 2 — Authentication ✅

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

---

## Phase 3 — Organization & Team Management ✅

Implemented organization management, team membership, and role-based access control.

### Completed

- Organization creation and management
- Organization membership
- One organization per user membership rule
- Team member management
- Role assignment and management
- Role-based access control (RBAC)
- Owner, Admin, Manager, Developer, QA, and Viewer roles
- Organization-level authorization
- Organization data isolation
- Organization management UI
- Organization switching
- Role-based frontend controls
- Membership validation and authorization

---

## Phase 4 — Project Management ✅

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

---

## Phase 5 — Task Management & Kanban ✅

Implemented task management and a Kanban-based engineering workflow inside projects.

### Completed

- Task creation and management
- Task retrieval and updating
- Task deletion
- Task assignment
- Task priority management
- Task status management
- Task due dates
- Project-based task isolation
- Task authorization and access control
- Kanban board interface
- To Do, In Progress, and Done workflow
- Moving tasks between Kanban columns
- Task status updates from the Kanban board
- Task creation from the project workflow
- Project task listing
- Task management UI
- Task detail/edit workflow
- Integration between projects and tasks
- Role/permission-based task controls
- Task progress tracking
- Project task statistics
- Completion percentage tracking

---

## Phase 6 — Collaboration ✅

Implemented collaboration features that allow team members to communicate and track project activity.

### Completed

- Task comments
- Comment creation and retrieval
- Comment management
- Project activity feed
- Activity tracking
- File upload foundations
- File attachment support
- Collaboration integrated with project resources
- Authorization for collaboration resources
- Project-level collaboration isolation
- Collaboration UI

---

## Phase 7 — Integration, Testing & Hardening ✅

Completed the integration and validation work required to make the implemented project features work together reliably.

### Completed

- Cross-feature integration
- Authentication and authorization validation
- Organization membership validation
- Organization data isolation validation
- Project access validation
- Project membership validation
- Task access and isolation testing
- Role and permission validation
- API validation
- Frontend workflow validation
- Membership refresh handling
- Multi-browser/session testing
- Protected resource validation
- Error handling and edge-case validation
- Phase-by-phase regression testing
- Final integration verification

---

# 🔐 Authentication & Authorization Flow

```text
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
        ↓
      Tasks
        ↓
 Collaboration
        ↓
 Comments / Activity / Files
        ↓
   Kanban Workflow


🏗️ Current Architecture
SETU
│
├── client/
│   └── React + Vite
│       ├── Components
│       ├── Pages
│       ├── Context
│       ├── Services
│       └── Routing
│
├── server/
│   ├── Controllers
│   ├── Models
│   ├── Routes
│   ├── Middleware
│   ├── Services
│   └── Configuration
│
├── MongoDB
│   ├── Users
│   ├── Organizations
│   ├── Projects
│   ├── Tasks
│   └── Collaboration Data
│
└── GitHub
    ├── main
    └── development



🔄 Project Workflow'
User
  ↓
Organization
  ↓
Project
  ↓
Project Members
  ↓
Tasks
  ↓
Kanban Board
  ↓
To Do
  ↓
In Progress
  ↓
Done
  ↓
Comments
  ↓
Activity Feed
  ↓
File Attachments



🛠️ Technology Stack
Frontend
React
Vite
JavaScript
HTML5
CSS3
Axios
Backend
Node.js
Express.js
JavaScript
JWT
bcryptjs
Database
MongoDB
Mongoose
Development & Testing Tools
Git
GitHub
VS Code
Postman
Automated API/integration tests