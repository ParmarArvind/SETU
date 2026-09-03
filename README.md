# SETU

### Shared Engineering Team Unified

SETU is a full-stack MERN collaboration platform designed to help software development teams manage projects, tasks, team members, and engineering workflows from a single platform.

The project is being developed phase-by-phase with a focus on clean architecture, authentication, scalability, and practical full-stack development.

---

## 🚀 Project Status

| Phase | Status |
|---|---|
| Phase 1 — Project Foundation | ✅ Completed |
| Phase 2 — Authentication | ✅ Completed |
| Phase 3 — Team & Project Management | ⏳ Upcoming |

---

## 🛠️ Tech Stack

### Frontend

- React.js
- Vite
- React Router
- Axios
- JavaScript
- HTML5
- CSS3

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs

### Development Tools

- Git
- GitHub
- VS Code
- Postman

---

# 📂 Project Structure

```text
SETU/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── auth.service.js
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/
│   ├── config/
│   │   └── env.js
│   │
│   ├── controllers/
│   │   └── auth.controller.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── notFound.middleware.js
│   │
│   ├── models/
│   │   └── user.model.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── health.routes.js
│   │
│   ├── app.js
│   ├── package.json
│   └── .env.example
│
├── .gitignore
├── README.md
└── package.json