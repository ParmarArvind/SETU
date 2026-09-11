import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';

import RequireRole from '../components/RequireRole';
import CommentSection from '../components/CommentSection';

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
import TaskAttachments from '../components/TaskAttachments';
import './task-attachments.css';
const PRIORITIES = [
  'low',
  'medium',
  'high',
  'critical',
];

const STATUSES = [
  'todo',
  'in_progress',
  'in_review',
  'done',
];


// --------------------------------------------------------------
// canChangeStatus mirrors the backend's
// requireStatusUpdatePermission.
// --------------------------------------------------------------
const canChangeStatus = (
  role,
  task,
  currentUserId,
) => {
  if (
    role === 'owner' ||
    role === 'admin'
  ) {
    return true;
  }

  const assigneeId =
    typeof task.assignee === 'object'
      ? task.assignee?._id
      : task.assignee;

  const isAssignee =
    String(assigneeId || '') ===
    String(currentUserId || '');

  return Boolean(isAssignee);
};

const TaskDetail = () => {
  const { taskId } = useParams();

  const { user } = useAuth();
  const { currentRole } = useOrganization();

  const currentUserId =
    user?._id || user?.id;

  // ------------------------------------------------------------
  // Task state
  // ------------------------------------------------------------
  const [task, setTask] = useState(null);

  const [projectMembers, setProjectMembers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState('');

  // ------------------------------------------------------------
  // Edit task state
  // ------------------------------------------------------------
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  });

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [editError, setEditError] =
    useState('');

  // ------------------------------------------------------------
  // Assignment state
  // ------------------------------------------------------------
  const [assigneeValue, setAssigneeValue] =
    useState('');

  const [assignError, setAssignError] =
    useState('');

  const [assignSuccess, setAssignSuccess] =
    useState('');

  const [assigning, setAssigning] =
    useState(false);

  // ------------------------------------------------------------
  // Priority state
  // ------------------------------------------------------------
  const [priorityValue, setPriorityValue] =
    useState('');

  const [priorityError, setPriorityError] =
    useState('');

  // ------------------------------------------------------------
  // Status state
  // ------------------------------------------------------------
  const [statusError, setStatusError] =
    useState('');

  // ------------------------------------------------------------
  // Load task
  // ------------------------------------------------------------
  const loadTask = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const result =
        await getTask(taskId);

      const loadedTask =
        result.data.task;

      setTask(loadedTask);

      setEditForm({
        title: loadedTask.title || '',
        description:
          loadedTask.description || '',
        dueDate: loadedTask.dueDate
          ? loadedTask.dueDate.slice(0, 10)
          : '',
      });

      setAssigneeValue(
        loadedTask.assignee?._id || '',
      );

      setPriorityValue(
        loadedTask.priority || 'medium',
      );

      // --------------------------------------------------------
      // Load project members
      // --------------------------------------------------------
      if (loadedTask.project) {
        const projectId =
          typeof loadedTask.project === 'object'
            ? loadedTask.project._id
            : loadedTask.project;

        const membersResult =
          await listProjectMembers(
            projectId,
          );

        setProjectMembers(
          membersResult.data.members || [],
        );
      }
    } catch (err) {
      setPageError(
        err.response?.data?.message ||
          'Failed to load task',
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // ------------------------------------------------------------
  // Edit form
  // ------------------------------------------------------------
  const handleEditChange = (event) => {
    setEditForm((prev) => ({
      ...prev,
      [event.target.name]:
        event.target.value,
    }));
  };

  const handleEditSave = async (
    event,
  ) => {
    event.preventDefault();

    setEditError('');
    setSavingEdit(true);

    try {
      const result =
        await updateTask(
          taskId,
          editForm,
        );

      setTask((prev) => ({
        ...prev,
        ...result.data.task,
      }));
    } catch (err) {
      setEditError(
        err.response?.data?.message ||
          'Failed to update task',
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // ------------------------------------------------------------
  // Assignment
  // ------------------------------------------------------------
  const handleAssign = async (
    event,
  ) => {
    event.preventDefault();

    /*
     * Prevent multiple clicks while the
     * previous request is running.
     */
    if (assigning) {
      return;
    }

    const nextAssigneeId =
      assigneeValue || null;

    /*
     * Get the currently assigned user.
     *
     * task.assignee can either be:
     *
     * {
     *   _id: "...",
     *   name: "Dinesh"
     * }
     *
     * or simply:
     *
     * "userId"
     */
    const currentAssigneeId =
      typeof task.assignee === 'object'
        ? task.assignee?._id || null
        : task.assignee || null;

    /*
     * If the user selects the same person who
     * is already assigned, don't make another
     * API request.
     *
     * This is important because otherwise the
     * activity feed can contain:
     *
     * Dinesh assigned login feature
     * Dinesh assigned login feature
     * Dinesh assigned login feature
     */
    if (
      String(nextAssigneeId || '') ===
      String(currentAssigneeId || '')
    ) {
      setAssignError('');

      setAssignSuccess(
        nextAssigneeId
          ? 'This task is already assigned to the selected member.'
          : 'This task is already unassigned.',
      );

      return;
    }

    // Clear previous messages.
    setAssignError('');
    setAssignSuccess('');

    // Disable the button.
    setAssigning(true);

    try {
      const result =
        await assignTask(
          taskId,
          nextAssigneeId,
        );

      const updatedTask =
        result.data.task;

      /*
       * Update the task using the server
       * response.
       */
      setTask(updatedTask);

      /*
       * Keep dropdown synchronized with
       * the actual server value.
       */
      const updatedAssigneeId =
        typeof updatedTask.assignee ===
        'object'
          ? updatedTask.assignee?._id || ''
          : updatedTask.assignee || '';

      setAssigneeValue(
        updatedAssigneeId,
      );

      /*
       * Show confirmation to the user.
       */
      const assignedMemberName =
        typeof updatedTask.assignee ===
        'object'
          ? updatedTask.assignee?.name
          : null;

      if (assignedMemberName) {
        setAssignSuccess(
          `✓ Task successfully assigned to ${assignedMemberName}.`,
        );
      } else {
        setAssignSuccess(
          '✓ Task successfully unassigned.',
        );
      }
    } catch (err) {
      setAssignError(
        err.response?.data?.message ||
          'Failed to assign task',
      );
    } finally {
      /*
       * Re-enable the button after
       * the request completes.
       */
      setAssigning(false);
    }
  };

  // ------------------------------------------------------------
  // Priority
  // ------------------------------------------------------------
  const handlePriorityChange = async (
    event,
  ) => {
    const newPriority =
      event.target.value;

    setPriorityValue(
      newPriority,
    );

    setPriorityError('');

    try {
      const result =
        await updateTaskPriority(
          taskId,
          newPriority,
        );

      setTask(
        result.data.task,
      );
    } catch (err) {
      setPriorityError(
        err.response?.data?.message ||
          'Failed to update priority',
      );

      /*
       * Restore the previous priority
       * when the API request fails.
       */
      setPriorityValue(
        task.priority,
      );
    }
  };

  // ------------------------------------------------------------
  // Status
  // ------------------------------------------------------------
  const handleStatusChange = async (
    newStatus,
  ) => {
    setStatusError('');

    try {
      const result =
        await updateTaskStatus(
          taskId,
          newStatus,
        );

      setTask(
        result.data.task,
      );
    } catch (err) {
      setStatusError(
        err.response?.data?.message ||
          'Failed to update status',
      );
    }
  };

  // ------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------
  if (loading) {
    return (
      <p>
        Loading task...
      </p>
    );
  }

  // ------------------------------------------------------------
  // Page error
  // ------------------------------------------------------------
  if (pageError) {
    return (
      <p role="alert">
        {pageError}
      </p>
    );
  }

  if (!task) {
    return null;
  }

  // ------------------------------------------------------------
  // Status permission
  // ------------------------------------------------------------
  const allowedToChangeStatus =
    canChangeStatus(
      currentRole,
      task,
      currentUserId,
    );

  // ------------------------------------------------------------
  // Project ID
  // ------------------------------------------------------------
  const projectId =
    typeof task.project === 'object'
      ? task.project._id
      : task.project;

  return (
    <div className="page page-task-detail task-detail">

      {/* ======================================================
          TASK HEADER
         ====================================================== */}

      <h1>
        {task.title}
      </h1>

      <p>
        <Link
          to={`/projects/${projectId}`}
        >
          Back to project
        </Link>
      </p>

      <p>
        Status: {task.status}
      </p>

      {/* ======================================================
          STATUS
         ====================================================== */}

      {allowedToChangeStatus && (
        <div>
          <label htmlFor="status-select">
            Move to:{' '}
          </label>

          <select
            id="status-select"
            value={task.status}
            onChange={(event) =>
              handleStatusChange(
                event.target.value,
              )
            }
          >
            {STATUSES.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ),
            )}
          </select>

          {statusError && (
            <p role="alert">
              {statusError}
            </p>
          )}
        </div>
      )}

      {/* ======================================================
          EDIT TASK
         ====================================================== */}

      <RequireRole
        allowedRoles={[
          'owner',
          'admin',
        ]}
      >
        <section>
          <h2>
            Edit Task
          </h2>

          <form
            onSubmit={
              handleEditSave
            }
          >
            <div>
              <label htmlFor="edit-title">
                Title
              </label>

              <input
                id="edit-title"
                name="title"
                type="text"
                value={
                  editForm.title
                }
                onChange={
                  handleEditChange
                }
                required
              />
            </div>

            <div>
              <label htmlFor="edit-description">
                Description
              </label>

              <textarea
                id="edit-description"
                name="description"
                value={
                  editForm.description
                }
                onChange={
                  handleEditChange
                }
              />
            </div>

            <div>
              <label htmlFor="edit-dueDate">
                Due date
              </label>

              <input
                id="edit-dueDate"
                name="dueDate"
                type="date"
                value={
                  editForm.dueDate
                }
                onChange={
                  handleEditChange
                }
              />
            </div>

            {editError && (
              <p role="alert">
                {editError}
              </p>
            )}

            <button
              type="submit"
              disabled={savingEdit}
            >
              {savingEdit
                ? 'Saving...'
                : 'Save Changes'}
            </button>
          </form>
        </section>
      </RequireRole>

      {/* ======================================================
          ASSIGNMENT
         ====================================================== */}

      <RequireRole
        allowedRoles={[
          'owner',
          'admin',
          'manager',
        ]}
        fallback={
          <p>
            Assignee:{' '}
            {task.assignee
              ? task.assignee.name
              : 'Unassigned'}
          </p>
        }
      >
        <section>
          <h2>
            Assignee
          </h2>

          <form
            onSubmit={
              handleAssign
            }
          >
            <select
              value={
                assigneeValue
              }
              onChange={(event) => {
                setAssigneeValue(
                  event.target.value,
                );

                /*
                 * Remove old success message
                 * as soon as the user selects
                 * another member.
                 */
                setAssignSuccess('');
                setAssignError('');
              }}
              disabled={assigning}
            >
              <option value="">
                Unassigned
              </option>

              {projectMembers.map(
                (member) => (
                  <option
                    key={
                      member.user._id
                    }
                    value={
                      member.user._id
                    }
                  >
                    {member.user.name}
                  </option>
                ),
              )}
            </select>

            <button
              type="submit"
              disabled={assigning}
            >
              {assigning
                ? 'Updating...'
                : 'Update Assignee'}
            </button>

            {/* Assignment success */}
            {assignSuccess && (
              <p
                className="task-action-success"
                role="status"
              >
                {assignSuccess}
              </p>
            )}

            {/* Assignment error */}
            {assignError && (
              <p
                className="task-action-error"
                role="alert"
              >
                {assignError}
              </p>
            )}
          </form>
        </section>
      </RequireRole>

      {/* ======================================================
          PRIORITY
         ====================================================== */}

      <RequireRole
        allowedRoles={[
          'owner',
          'admin',
          'manager',
        ]}
        fallback={
          <p>
            Priority:{' '}
            {task.priority}
          </p>
        }
      >
        <section>
          <h2>
            Priority
          </h2>

          <select
            value={
              priorityValue
            }
            onChange={
              handlePriorityChange
            }
          >
            {PRIORITIES.map(
              (priority) => (
                <option
                  key={priority}
                  value={priority}
                >
                  {priority}
                </option>
              ),
            )}
          </select>

          {priorityError && (
            <p role="alert">
              {priorityError}
            </p>
          )}
        </section>
      </RequireRole>

      {/* ======================================================
          LABELS
         ====================================================== */}

      {task.labels &&
        task.labels.length > 0 && (
          <p>
            Labels:{' '}
            {task.labels.join(
              ', ',
            )}
          </p>
        )}

      {/* ======================================================
          COMMENTS
         ====================================================== */}

      
      <CommentSection
        taskId={taskId}
      />

<TaskAttachments taskId={taskId} />
    </div>
  );
};

export default TaskDetail;