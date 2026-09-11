import { useState } from 'react';
import {
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const projectMatch = location.pathname.match(
    /^\/projects\/([^/]+)/,
  );
  const taskMatch = location.pathname.match(
    /^\/tasks\/([^/]+)/,
  );
  const organizationMatch = location.pathname.match(
    /^\/organizations\/([^/]+)/,
  );

  const projectId = projectMatch?.[1];
  const taskId = taskMatch?.[1];
  const organizationId = organizationMatch?.[1];

  const linkClass = ({ isActive }) =>
    `sidebar-link ${isActive ? 'active' : ''}`;

  // Project workspace gets the most useful navigation.
  if (projectId) {
    return (
      <aside
        className={`sidebar ${
          collapsed ? 'sidebar-collapsed' : ''
        }`}
      >
        <div className="sidebar-top">
          <div className="sidebar-section-label">
            {!collapsed && 'PROJECT WORKSPACE'}
          </div>

          <div className="sidebar-project-name">
            <span className="sidebar-project-icon">📁</span>

            {!collapsed && (
              <span className="sidebar-project-label">
                Project
              </span>
            )}
          </div>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Project navigation"
        >
          <NavLink
            to={`/projects/${projectId}`}
            end
            className={linkClass}
            title="Overview"
          >
            <span className="sidebar-icon">▦</span>
            {!collapsed && <span>Overview</span>}
          </NavLink>

          <NavLink
            to={`/projects/${projectId}/tasks`}
            className={linkClass}
            title="Task List"
          >
            <span className="sidebar-icon">☑</span>
            {!collapsed && <span>Task List</span>}
          </NavLink>

          <NavLink
            to={`/projects/${projectId}/kanban`}
            className={linkClass}
            title="Kanban Board"
          >
            <span className="sidebar-icon">▥</span>
            {!collapsed && <span>Kanban Board</span>}
          </NavLink>
        </nav>

        <div className="sidebar-divider" />

        <button
          type="button"
          className="sidebar-secondary-action"
          onClick={() => navigate('/dashboard')}
          title="Back to Dashboard"
        >
          <span className="sidebar-icon">⌂</span>
          {!collapsed && <span>Dashboard</span>}
        </button>

        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={
            collapsed ? 'Expand sidebar' : 'Collapse sidebar'
          }
        >
          <span>{collapsed ? '→' : '←'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>
    );
  }

  // Task detail gets a small task-focused sidebar.
  if (taskId) {
    return (
      <aside
        className={`sidebar ${
          collapsed ? 'sidebar-collapsed' : ''
        }`}
      >
        <div className="sidebar-top">
          <div className="sidebar-section-label">
            {!collapsed && 'TASK WORKSPACE'}
          </div>

          <div className="sidebar-project-name">
            <span className="sidebar-project-icon">✓</span>
            {!collapsed && (
              <span className="sidebar-project-label">
                Task Details
              </span>
            )}
          </div>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Task navigation"
        >
          <button
            type="button"
            className="sidebar-link"
            onClick={() => navigate(-1)}
            title="Back"
          >
            <span className="sidebar-icon">←</span>
            {!collapsed && <span>Back</span>}
          </button>
        </nav>

        <div className="sidebar-divider" />

        <button
          type="button"
          className="sidebar-secondary-action"
          onClick={() => navigate('/dashboard')}
          title="Dashboard"
        >
          <span className="sidebar-icon">⌂</span>
          {!collapsed && <span>Dashboard</span>}
        </button>

        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={
            collapsed ? 'Expand sidebar' : 'Collapse sidebar'
          }
        >
          <span>{collapsed ? '→' : '←'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>
    );
  }

  // Organization pages get organization-specific navigation.
  if (organizationId) {
    return (
      <aside
        className={`sidebar ${
          collapsed ? 'sidebar-collapsed' : ''
        }`}
      >
        <div className="sidebar-top">
          <div className="sidebar-section-label">
            {!collapsed && 'ORGANIZATION'}
          </div>

          <div className="sidebar-project-name">
            <span className="sidebar-project-icon">🏢</span>

            {!collapsed && (
              <span className="sidebar-project-label">
                Organization
              </span>
            )}
          </div>
        </div>

        <nav
          className="sidebar-nav"
          aria-label="Organization navigation"
        >
          <NavLink
            to={`/organizations/${organizationId}`}
            end
            className={linkClass}
            title="Overview"
          >
            <span className="sidebar-icon">▦</span>
            {!collapsed && <span>Overview</span>}
          </NavLink>

          <NavLink
            to={`/organizations/${organizationId}/projects`}
            className={linkClass}
            title="Projects"
          >
            <span className="sidebar-icon">📁</span>
            {!collapsed && <span>Projects</span>}
          </NavLink>
        </nav>

        <div className="sidebar-divider" />

        <button
          type="button"
          className="sidebar-secondary-action"
          onClick={() => navigate('/dashboard')}
          title="Dashboard"
        >
          <span className="sidebar-icon">⌂</span>
          {!collapsed && <span>Dashboard</span>}
        </button>

        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={
            collapsed ? 'Expand sidebar' : 'Collapse sidebar'
          }
        >
          <span>{collapsed ? '→' : '←'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>
    );
  }

  // Dashboard / Organizations list / other top-level pages:
  // show a lightweight application sidebar.
  return (
    <aside
      className={`sidebar ${
        collapsed ? 'sidebar-collapsed' : ''
      }`}
    >
      <div className="sidebar-top">
        <div className="sidebar-section-label">
          {!collapsed && 'WORKSPACE'}
        </div>

        <div className="sidebar-project-name">
          <span className="sidebar-project-icon">S</span>

          {!collapsed && (
            <span className="sidebar-project-label">
              SETU
            </span>
          )}
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Workspace navigation">
        <NavLink
          to="/dashboard"
          className={linkClass}
          title="Dashboard"
        >
          <span className="sidebar-icon">⌂</span>
          {!collapsed && <span>Dashboard</span>}
        </NavLink>

        <NavLink
          to="/organizations"
          className={linkClass}
          title="Organizations"
        >
          <span className="sidebar-icon">🏢</span>
          {!collapsed && <span>Organizations</span>}
        </NavLink>
      </nav>

      <div className="sidebar-divider" />

      <button
        type="button"
        className="sidebar-collapse-button"
        onClick={() => setCollapsed((value) => !value)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={
          collapsed ? 'Expand sidebar' : 'Collapse sidebar'
        }
      >
        <span>{collapsed ? '→' : '←'}</span>
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
};

export default Sidebar;
