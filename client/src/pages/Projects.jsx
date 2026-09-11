import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrganization } from '../context/OrganizationContext';
import { useProjects } from '../context/ProjectContext';
import RequireRole from '../components/RequireRole';

const Projects = () => {
  const { id: organizationId } = useParams();
  const { currentOrganization } = useOrganization();
  const {
    projects,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    createProject,
  } = useProjects();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const project = await createProject(formData);
      setFormData({ name: '', description: '' });
      navigate(`/projects/${project._id}`);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page page-projects">
      <div className="page-hero">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Projects — {currentOrganization?.name}</h1>
          <p className="page-subtitle">Projects, delivery progress and team workspaces.</p>
        </div>
        <div className="page-hero-actions">
        <label htmlFor="status-filter">Show: </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
        </div>
      </div>

      {loading && <p>Loading projects...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && projects.length === 0 && (
        <p>No {statusFilter !== 'all' ? statusFilter : ''} projects yet.</p>
      )}

      <ul className="card-grid">
        {projects.map((project) => (
          <li key={project._id} className="project-card">
            <button type="button" className="card-link-button" onClick={() => navigate(`/projects/${project._id}`)}>
              {project.name}
            </button>{' '}
            {project.status === 'archived' && <em>(archived)</em>}
          </li>
        ))}
      </ul>

      {/* Create is projects:create — owner/admin/manager per the permission matrix */}
      <RequireRole allowedRoles={['owner', 'admin', 'manager']}>
        <section className="form-card create-form-card">
          <div className="section-heading">
          <div>
            <span className="eyebrow">Create</span>
            <h2>Create a new project</h2>
          </div>
        </div>
          <form onSubmit={handleCreate}>
          <div>
            <label htmlFor="project-name">Project name</label>
            <input
              id="project-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="project-description">Description (optional)</label>
            <textarea
              id="project-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {createError && <p role="alert">{createError}</p>}

          <button type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create Project'}
          </button>
          </form>
      </section>
      </RequireRole>
    </div>
  );
};

export default Projects;