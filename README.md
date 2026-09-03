### SETU -> Shared Engineering Team Unified

## Local Setup

1. **Clone the repository**
```bash
   git clone <repository-url>
   cd devsync
```

2. **Install dependencies**
```bash
   cd server && npm install
   cd ../client && npm install
```

3. **Configure environment variables**

   Copy the example files and fill in real local values:
```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
```

4. **Start MongoDB**

   Ensure a local MongoDB instance is running on `mongodb://localhost:27017`.

5. **Start the backend**
```bash
   cd server
   npm run dev
```
   Runs on `http://localhost:5000`.

6. **Start the frontend**
```bash
   cd client
   npm run dev
```
   Runs on `http://localhost:5173`.

## API

### `GET /api/health`

Returns the backend's running status.

**Response**
```json
{
  "success": true,
  "message": "DevSync API is running"
}
```

## Development Status

**Phase 1 — Foundation: Completed**

- [x] Monorepo structure
- [x] React + Vite frontend shell
- [x] Express backend with modular architecture
- [x] MongoDB connection via Mongoose
- [x] Centralized environment configuration
- [x] Health check API (Route → Controller → Response pattern)
- [x] Centralized error handling (404 + 500)
- [x] Centralized Axios instance on the frontend
- [x] Full frontend ↔ backend connectivity (loading/success/failure states)
- [x] Git repository with `main`/`development` branch structure

**Not yet implemented** (future phases): authentication, organizations, projects, tasks, Kanban, real-time collaboration, notifications, AI assistant, analytics, Redis caching, testing, Docker, CI/CD.


See the [Software Requirements Specification](./docs/SRS.md) for the full project scope and phase breakdown.