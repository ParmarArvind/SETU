import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrganizationProvider } from './context/OrganizationContext';
import { ProjectProvider } from './context/ProjectContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import OrganizationDetail from './pages/OrganizationDetail';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';
import KanbanBoard from './pages/KanbanBoard';
import TaskDetail from './pages/TaskDetail';

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <ProjectProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<div>SETU — Home</div>} />

              <Route path="/login" element={<Login />} />

              <Route path="/register" element={<Register />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/organizations"
                element={
                  <ProtectedRoute>
                    <Organizations />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/organizations/:id"
                element={
                  <ProtectedRoute>
                    <OrganizationDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/organizations/:id/projects"
                element={
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/projects/:projectId"
                element={
                  <ProtectedRoute>
                    <ProjectDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/projects/:projectId/tasks"
                element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/projects/:projectId/kanban"
                element={
                  <ProtectedRoute>
                    <KanbanBoard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tasks/:taskId"
                element={
                  <ProtectedRoute>
                    <TaskDetail />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </ProjectProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
}

export default App;