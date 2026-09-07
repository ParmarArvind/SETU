import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import RequireRole from '../components/RequireRole';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import {
  getTask,
  updateTask,
  assignTask,
  updateTaskPriority,
  updateTaskStatus,
} from '../services/task.service';
import { listProjectMembers } from '../services/project.service';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['todo', 'in_progress', 'in_review', 'done'];

// --------------------------------------------------------------
// canChangeStatus mirrors the backend's requireStatusUpdatePermission
// (task.middleware.js) exactly: Owner/Admin can move anything;
// a Developer can only move a task they are the assignee of. This
// is a client-side convenience for hiding the status control from
// people who can't use it — same caveat as RequireRole: the real
// enforcement is the backend, this just avoids showing a control
// that would 403 on click.
// --------------------------------------------------------------
const canChangeStatus = (role, task, currentUserId) => {
  if (role === 'owner' || role === 'admin') return true;
  const isAssignee = task.assignee && task.assignee._id === currentUserId;
  return Boolean(isAssignee); // developer's tasks:update_own_status is implied here
};

const TaskDetail = () => {
  const { taskId } = useParams();
  const { user } = useAuth();
  const { currentRole } = useOrganization();
  const currentUserId = user?._id || user?.id;

  const [task, setTask] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [editForm, setEditForm] = useState({ title: '', description: '', dueDate: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const [assigneeValue, setAssigneeValue] = useState('');
  const [assignError, setAssignError] = useState('');

  const [priorityValue, setPriorityValue] = useState('');
  const [priorityError, setPriorityError] = useState('');

  const [statusError, setStatusError] = useState('');

  const loadTask = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const result = await getTask(taskId);
      const loadedTask = result.data.task;
      setTask(loadedTask);
      setEditForm({
        title: loadedTask.title,
        description: loadedTask.description || '',
        dueDate: loadedTask.dueDate ? loadedTask.dueDate.slice(0, 10) : '',
      });
      setAssigneeValue(loadedTask.assignee?._id || '');
      setPriorityValue(loadedTask.priority);

      if (loadedTask.project) {
        const projectId =
            typeof loadedTask.project === 'object'
            ? loadedTask.project._id
            : loadedTask.project;

        const membersResult = await listProjectMembers(projectId);
        setProjectMembers(membersResult.data.members);
        }
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleEditChange = (e) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditError('');
    setSavingEdit(true);

    try {
      const result = await updateTask(taskId, editForm);
      setTask((prev) => ({ ...prev, ...result.data.task }));
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update task');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setAssignError('');

    try {
      const result = await assignTask(taskId, assigneeValue || null);
      setTask(result.data.task);
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Failed to assign task');
    }
  };

  const handlePriorityChange = async (e) => {
    const newPriority = e.target.value;
    setPriorityValue(newPriority);
    setPriorityError('');

    try {
      const result = await updateTaskPriority(taskId, newPriority);
      setTask(result.data.task);
    } catch (err) {
      setPriorityError(err.response?.data?.message || 'Failed to update priority');
      setPriorityValue(task.priority);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusError('');

    try {
      const result = await updateTaskStatus(taskId, newStatus);
      setTask(result.data.task);
    } catch (err) {
      setStatusError(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (loading) return <p>Loading task...</p>;
  if (pageError) return <p role="alert">{pageError}</p>;
  if (!task) return null;

  const allowedToChangeStatus = canChangeStatus(currentRole, task, currentUserId);
  const projectId =
  typeof task.project === 'object'
    ? task.project._id
    : task.project;
  return (
    <div>
      <h1>{task.title}</h1>
      <p>
        <Link to={`/projects/${projectId}`}>Back to project</Link>      </p>

      <p>Status: {task.status}</p>

      {allowedToChangeStatus && (
        <div>
          <label htmlFor="status-select">Move to: </label>
          <select
            id="status-select"
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {statusError && <p role="alert">{statusError}</p>}
        </div>
      )}

      {/* Edit title/description/dueDate: tasks:update — owner/admin only */}
      <RequireRole allowedRoles={['owner', 'admin']}>
        <section>
          <h2>Edit Task</h2>
          <form onSubmit={handleEditSave}>
            <div>
              <label htmlFor="edit-title">Title</label>
              <input
                id="edit-title"
                name="title"
                type="text"
                value={editForm.title}
                onChange={handleEditChange}
                required
              />
            </div>

            <div>
              <label htmlFor="edit-description">Description</label>
              <textarea
                id="edit-description"
                name="description"
                value={editForm.description}
                onChange={handleEditChange}
              />
            </div>

            <div>
              <label htmlFor="edit-dueDate">Due date</label>
              <input
                id="edit-dueDate"
                name="dueDate"
                type="date"
                value={editForm.dueDate}
                onChange={handleEditChange}
              />
            </div>

            {editError && <p role="alert">{editError}</p>}

            <button type="submit" disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </section>
      </RequireRole>

      {/* Assign: tasks:assign — owner/admin/manager */}
      <RequireRole
        allowedRoles={['owner', 'admin', 'manager']}
        fallback={<p>Assignee: {task.assignee ? task.assignee.name : 'Unassigned'}</p>}
      >
        <section>
          <h2>Assignee</h2>
          <form onSubmit={handleAssign}>
            <select value={assigneeValue} onChange={(e) => setAssigneeValue(e.target.value)}>
              <option value="">Unassigned</option>
              {projectMembers.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name}
                </option>
              ))}
            </select>
            <button type="submit">Update Assignee</button>
            {assignError && <p role="alert">{assignError}</p>}
          </form>
        </section>
      </RequireRole>

      {/* Priority: tasks:manage_priority — owner/admin/manager */}
      <RequireRole
        allowedRoles={['owner', 'admin', 'manager']}
        fallback={<p>Priority: {task.priority}</p>}
      >
        <section>
          <h2>Priority</h2>
          <select value={priorityValue} onChange={handlePriorityChange}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          {priorityError && <p role="alert">{priorityError}</p>}
        </section>
      </RequireRole>

      {task.labels && task.labels.length > 0 && <p>Labels: {task.labels.join(', ')}</p>}
    </div>
  );
};

export default TaskDetail;