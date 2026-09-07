import mongoose from 'mongoose';

// --------------------------------------------------------------
// Priority and status enums, exported so controllers/middleware
// validate against the same source of truth instead of
// re-declaring the list (same pattern as ORG_ROLES in
// OrganizationMember.js).
// --------------------------------------------------------------
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'];

// Order matters here: it's the left-to-right column order on the
// Kanban board (SRS FR-19/FR-20), not just a validation list.
export const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done'];

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Task title must be at least 2 characters'],
      maxlength: [200, 'Task title must be at most 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description must be at most 5000 characters'],
      default: '',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Task must belong to a project'],
    },
    // Denormalized from Project.organization — same reasoning as
    // ProjectMember.organization (Phase 4, Milestone 1): lets
    // loadTask and any task query verify/filter by organization
    // without an extra populate() just to check tenancy. Always
    // set this from the parent Project document, never from
    // client input.
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Task must record its organization'],
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    priority: {
      type: String,
      enum: {
        values: TASK_PRIORITIES,
        message: 'Priority must be one of: ' + TASK_PRIORITIES.join(', '),
      },
      default: 'medium',
    },
    status: {
      type: String,
      enum: {
        values: TASK_STATUSES,
        message: 'Status must be one of: ' + TASK_STATUSES.join(', '),
      },
      default: 'todo',
    },
    // Simple string array rather than a separate Label collection.
    // SRS lists Label as its own entity (Section 8), but a full
    // label model (org-scoped, colored, reusable across tasks)
    // is more than FR-12/FR-16 need right now. Flagging this as a
    // deliberate simplification — worth revisiting if labels need
    // to be managed centrally later rather than typed per-task.
    labels: {
      type: [String],
      default: [],
    },
    dueDate: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must record who created it'],
    },
  },
  {
    timestamps: true,
  }
);

// --------------------------------------------------------------
// { project, status } — every Kanban board load (Milestone 6)
// groups a project's tasks by status; this is that query's index.
// --------------------------------------------------------------
taskSchema.index({ project: 1, status: 1 });

// { project, assignee } — "my tasks in this project" and the
// assignee filter (Milestone 7) both hit this shape.
taskSchema.index({ project: 1, assignee: 1 });

// { organization, assignee } — supports a future "my tasks across
// the whole organization" view without scanning every project.
taskSchema.index({ organization: 1, assignee: 1 });

taskSchema.methods.toJSON = function toJSON() {
  const task = this.toObject();
  delete task.__v;
  return task;
};

const Task = mongoose.model('Task', taskSchema);

export default Task;