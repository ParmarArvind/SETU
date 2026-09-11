import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';

import { AuthProvider } from './context/AuthContext';
import {
  OrganizationProvider,
} from './context/OrganizationContext';
import {
  ProjectProvider,
} from './context/ProjectContext';

import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Notifications from './pages/Notifications';
import OrganizationDetail from './pages/OrganizationDetail';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';
import KanbanBoard from './pages/KanbanBoard';
import TaskDetail from './pages/TaskDetail';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <OrganizationProvider>
        <ProjectProvider>
          <BrowserRouter>
            <Routes>

              {/* =========================
                  Public Routes
                 ========================= */}

              <Route
                path="/"
                element={
                  <div className="home-page">
                    <div className="home-card">
                      <div className="home-logo">
                        S
                      </div>

                      <h1>Welcome to SETU</h1>

                      <p>
                        Developer collaboration and
                        project management platform.
                      </p>

                      <div className="home-actions">
                        <a href="/login">
                          Login
                        </a>

                        <a href="/register">
                          Create Account
                        </a>
                      </div>
                    </div>
                  </div>
                }
              />

              <Route
                path="/login"
                element={<Login />}
              />

              <Route
                path="/register"
                element={<Register />}
              />

              {/* =========================
                  Protected Application
                 ========================= */}

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >

                <Route
                  path="/dashboard"
                  element={<Dashboard />}
                />

                <Route
                  path="/organizations"
                  element={<Organizations />}
                />

                {/* Notifications Page */}
                <Route
                  path="/notifications"
                  element={<Notifications />}
                />

                <Route
                  path="/organizations/:id"
                  element={<OrganizationDetail />}
                />

                <Route
                  path="/organizations/:id/projects"
                  element={<Projects />}
                />

                <Route
                  path="/projects/:projectId"
                  element={<ProjectDetail />}
                />

                <Route
                  path="/projects/:projectId/tasks"
                  element={<Tasks />}
                />

                <Route
                  path="/projects/:projectId/kanban"
                  element={<KanbanBoard />}
                />

                <Route
                  path="/tasks/:taskId"
                  element={<TaskDetail />}
                />

              </Route>

            </Routes>
          </BrowserRouter>
        </ProjectProvider>
      </OrganizationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;