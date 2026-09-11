import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import { useProjects } from '../context/ProjectContext';

const Dashboard = () => {
  const { user } = useAuth();

  const {
    organizations,
    currentOrganizationId,
    currentRole,
    selectOrganization,
  } = useOrganization();

  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
  } = useProjects();

  const navigate = useNavigate();

  const handleSwitch = (e) => {
    const organizationId = e.target.value;

    selectOrganization(organizationId);
    navigate(`/organizations/${organizationId}`);
  };

  const visibleProjects = projects.slice(0, 6);

  return (
    <div className="page page-dashboard">
      <div className="page-hero dashboard-welcome">
        <div>
          <span className="eyebrow">Developer workspace</span>
          <h1>Welcome back, {user?.name}</h1>
          <p className="page-subtitle">
            Your projects, teams and development work in one place.
          </p>
        </div>
      </div>

      {organizations.length > 0 ? (
        <>
          <section className="dashboard-org-card">
            <div className="dashboard-org-info">
              <strong>Current organization</strong>
              <span>
                {currentRole
                  ? `You are a ${currentRole}`
                  : 'Select an organization to continue'}
              </span>
            </div>

            <select
              className="dashboard-org-selector"
              value={currentOrganizationId || ''}
              onChange={handleSwitch}
              aria-label="Select organization"
            >
              {organizations.map(({ organization }) => (
                <option key={organization._id} value={organization._id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="eyebrow">Projects</span>
                <h2>Your projects</h2>
                <p>Open a project directly from your dashboard.</p>
              </div>

              <Link
                className="dashboard-view-all"
                to={`/organizations/${currentOrganizationId}/projects`}
              >
                View all projects →
              </Link>
            </div>

            {projectsLoading && (
              <div className="dashboard-empty">
                <p>Loading projects...</p>
              </div>
            )}

            {projectsError && !projectsLoading && (
              <div className="dashboard-empty">
                <h3>Unable to load projects</h3>
                <p>{projectsError}</p>
                <Link
                  className="dashboard-primary-action"
                  to={`/organizations/${currentOrganizationId}/projects`}
                >
                  Open Projects
                </Link>
              </div>
            )}

            {!projectsLoading &&
              !projectsError &&
              visibleProjects.length > 0 && (
                <div className="dashboard-project-grid">
                  {visibleProjects.map((project) => (
                    <article
                      key={project._id}
                      className="dashboard-project-card"
                    >
                      <span className="eyebrow">
                        {project.status === 'archived'
                          ? 'Archived project'
                          : 'Active project'}
                      </span>

                      <h3>{project.name}</h3>

                      <p>
                        {project.description ||
                          'No project description added yet.'}
                      </p>

                      <div className="project-card-footer">
                        <span
                          className={`project-status-small ${
                            project.status === 'archived'
                              ? 'archived'
                              : ''
                          }`}
                        >
                          {project.status || 'active'}
                        </span>

                        <Link
                          className="project-open-button"
                          to={`/projects/${project._id}`}
                        >
                          Open Project →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}

            {!projectsLoading &&
              !projectsError &&
              visibleProjects.length === 0 && (
                <div className="dashboard-empty">
                  <div className="empty-icon">📁</div>
                  <h3>No projects yet</h3>
                  <p>
                    Create your first project and start organizing your
                    development work.
                  </p>

                  <Link
                    className="dashboard-primary-action"
                    to={`/organizations/${currentOrganizationId}/projects`}
                  >
                    Go to Projects
                  </Link>
                </div>
              )}
          </section>
        </>
      ) : (
        <section className="dashboard-empty">
          <div className="empty-icon">🏢</div>
          <h3>No organization yet</h3>
          <p>
            Create or join an organization before creating projects.
          </p>

          <Link
            className="dashboard-primary-action"
            to="/organizations"
          >
            Manage Organizations →
          </Link>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
