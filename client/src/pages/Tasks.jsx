import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { listTasks, createTask } from '../services/task.service';
import { listProjectMembers } from '../services/project.service';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['todo', 'in_progress', 'in_review', 'done'];

const Tasks = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
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

  const [createForm, setCreateForm] = useState({ title: '', description: '', priority: 'medium' });
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
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    listProjectMembers(projectId)
      .then((result) => setProjectMembers(result.data.members))
      .catch(() => setProjectMembers([]));
  }, [projectId]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleCreateChange = (e) => {
    setCreateForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const result = await createTask(projectId, createForm);
      setCreateForm({ title: '', description: '', priority: 'medium' });
      navigate(`/tasks/${result.data.task._id}`);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1>Tasks</h1>
      <p>
        <Link to={`/projects/${projectId}`}>Back to project</Link>
        {' · '}
        <Link to={`/projects/${projectId}/kanban`}>Kanban view</Link>
      </p>

      <section>
        <h2>Filter</h2>
        <input
          name="search"
          placeholder="Search title or description..."
          value={filters.search}
          onChange={handleFilterChange}
        />

        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">Any status</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select name="priority" value={filters.priority} onChange={handleFilterChange}>
          <option value="">Any priority</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>

        <select name="assignee" value={filters.assignee} onChange={handleFilterChange}>
          <option value="">Any assignee</option>
          <option value="unassigned">Unassigned</option>
          {projectMembers.map((m) => (
            <option key={m.user._id} value={m.user._id}>
              {m.user.name}
            </option>
          ))}
        </select>

        <input
          name="label"
          placeholder="Label..."
          value={filters.label}
          onChange={handleFilterChange}
        />
      </section>

      {loading && <p>Loading tasks...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && tasks.length === 0 && <p>No tasks match these filters.</p>}

      <ul>
        {tasks.map((task) => (
          <li key={task._id}>
            <Link to={`/tasks/${task._id}`}>{task.title}</Link> — {task.status} —{' '}
            {task.priority}
            {task.assignee && <> — {task.assignee.name}</>}
          </li>
        ))}
      </ul>

      {pagination.totalPages > 1 && (
        <p>
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            Previous
          </button>{' '}
          Page {pagination.page} of {pagination.totalPages} ({pagination.total} total){' '}
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            Next
          </button>
        </p>
      )}

      <h2>Create a task</h2>
      <form onSubmit={handleCreate}>
        <div>
          <label htmlFor="task-title">Title</label>
          <input
            id="task-title"
            name="title"
            type="text"
            value={createForm.title}
            onChange={handleCreateChange}
            required
          />
        </div>

        <div>
          <label htmlFor="task-description">Description</label>
          <textarea
            id="task-description"
            name="description"
            value={createForm.description}
            onChange={handleCreateChange}
          />
        </div>

        <div>
          <label htmlFor="task-priority">Priority</label>
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

        {createError && <p role="alert">{createError}</p>}

        <button type="submit" disabled={creating}>
          {creating ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
};

export default Tasks;