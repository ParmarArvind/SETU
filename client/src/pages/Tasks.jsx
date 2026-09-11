import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { listTasks, createTask } from '../services/task.service';
import { listProjectMembers } from '../services/project.service';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['todo', 'in_progress', 'in_review', 'done'];

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const Tasks = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [projectMembers, setProjectMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    assignee: '',
    label: '',
    page: 1,
    limit: 20,
  });

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
  });

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await listTasks(projectId, filters);

      setTasks(result.data.tasks);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load tasks',
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    listProjectMembers(projectId)
      .then((result) => {
        setProjectMembers(result.data.members);
      })
      .catch(() => {
        setProjectMembers([]);
      });
  }, [projectId]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleCreateChange = (e) => {
    setCreateForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    setCreateError('');
    setCreating(true);

    try {
      const result = await createTask(projectId, createForm);

      setCreateForm({
        title: '',
        description: '',
        priority: 'medium',
      });

      navigate(`/tasks/${result.data.task._id}`);
    } catch (err) {
      setCreateError(
        err.response?.data?.message || 'Failed to create task',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page page-tasks">

      {/* PAGE HEADER */}
      <div className="page-hero">
        <div>
          <span className="eyebrow">Project work</span>
          <h1>Tasks</h1>
          <p className="page-subtitle">
            Track work, assignments, priorities and delivery status.
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <section className="filter-card task-filter-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Filters</span>
            <h2>Find tasks</h2>
          </div>
        </div>

        <div className="task-filters-grid">
          <input
            name="search"
            placeholder="Search title or description..."
            value={filters.search}
            onChange={handleFilterChange}
          />

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">Any status</option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          <select
            name="priority"
            value={filters.priority}
            onChange={handleFilterChange}
          >
            <option value="">Any priority</option>

            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>

          <select
            name="assignee"
            value={filters.assignee}
            onChange={handleFilterChange}
          >
            <option value="">Any assignee</option>
            <option value="unassigned">Unassigned</option>

            {projectMembers.map((member) => (
              <option
                key={member.user._id}
                value={member.user._id}
              >
                {member.user.name}
              </option>
            ))}
          </select>

          <input
            name="label"
            placeholder="Filter by label..."
            value={filters.label}
            onChange={handleFilterChange}
          />
        </div>
      </section>

      {/* STATES */}
      {loading && (
        <div className="task-state-card">
          <span>Loading tasks...</span>
        </div>
      )}

      {error && (
        <div className="task-state-card task-state-error" role="alert">
          {error}
        </div>
      )}

      {/* TASK LIST */}
      {!loading && !error && tasks.length === 0 && (
        <div className="task-empty-card">
          <div className="task-empty-icon">✓</div>
          <h3>No tasks found</h3>
          <p>
            No tasks match your current filters. Create a new task
            below to get started.
          </p>
        </div>
      )}

      {!loading && tasks.length > 0 && (
        <section className="tasks-section">

          <div className="tasks-section-header">
            <div>
              <span className="eyebrow">Work items</span>
              <h2>Project Tasks</h2>
            </div>

            <span className="task-count-badge">
              {pagination.total} total
            </span>
          </div>

          <div className="task-list">

            {tasks.map((task) => (
              <article
                key={task._id}
                className={`task-card task-card-${task.status}`}
              >

                <div className="task-card-main">

                  <div className="task-card-title-row">
                    <Link
                      to={`/tasks/${task._id}`}
                      className="task-title"
                    >
                      {task.title}
                    </Link>

                    <span
                      className={`task-status-badge task-status-${task.status}`}
                    >
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>

                  {task.description && (
                    <p className="task-description">
                      {task.description}
                    </p>
                  )}

                  <div className="task-card-meta">

                    <span
                      className={`task-priority task-priority-${task.priority}`}
                    >
                      <span className="task-meta-label">
                        Priority
                      </span>
                      {task.priority}
                    </span>

                    <span className="task-assignee">
                      <span className="task-meta-label">
                        Assignee
                      </span>

                      {task.assignee?.name || 'Unassigned'}
                    </span>

                  </div>

                </div>

                <Link
                  to={`/tasks/${task._id}`}
                  className="task-open-button"
                >
                  Open →
                </Link>

              </article>
            ))}

          </div>

          {/* PAGINATION */}
          {pagination.totalPages > 1 && (
            <div className="task-pagination">

              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() =>
                  handlePageChange(pagination.page - 1)
                }
              >
                ← Previous
              </button>

              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={
                  pagination.page >= pagination.totalPages
                }
                onClick={() =>
                  handlePageChange(pagination.page + 1)
                }
              >
                Next →
              </button>

            </div>
          )}
        </section>
      )}

      {/* CREATE TASK */}
      <section className="form-card create-form-card">
        
        <div className="section-heading">
          <div>
            <span className="eyebrow">Create</span>
            <h2>Create a task</h2>
          </div>
        </div>

        <form onSubmit={handleCreate} className="compact-form">

          <div className="form-field">
            <label htmlFor="task-title">
              Title
            </label>

            <input
              id="task-title"
              name="title"
              type="text"
              placeholder="e.g. Implement login validation"
              value={createForm.title}
              onChange={handleCreateChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="task-description">
              Description
            </label>

            <textarea
              id="task-description"
              name="description"
              placeholder="Describe what needs to be completed..."
              value={createForm.description}
              onChange={handleCreateChange}
              rows={4}
            />
          </div>

          <div className="form-field create-task-priority">
            <label htmlFor="task-priority">
              Priority
            </label>

            <select
              id="task-priority"
              name="priority"
              value={createForm.priority}
              onChange={handleCreateChange}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          {createError && (
            <p role="alert">
              {createError}
            </p>
          )}

          <div className="create-task-actions">
            <button
              type="submit"
              disabled={creating}
              className="button button-primary"
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
          </div>

        </form>

      </section>

    </div>
  );
};

export default Tasks;