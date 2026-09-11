import mongoose from 'mongoose';

export const ACTIVITY_ACTIONS = [
  'project.created',
  'project.updated',
  'project.archived',
  'project.unarchived',

  'project.member_added',
  'project.member_removed',

  'task.created',
  'task.updated',
  'task.assigned',
  'task.unassigned',
  'task.priority_changed',
  'task.status_changed',

  'comment.created',
  'comment.updated',
  'comment.deleted',
];

export const ACTIVITY_ENTITY_TYPES = [
  'project',
  'task',
  'comment',
  'project_member',
];

const activitySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    action: {
      type: String,
      enum: {
        values: ACTIVITY_ACTIONS,
        message: 'Invalid activity action',
      },
      required: true,
    },

    entityType: {
      type: String,
      enum: {
        values: ACTIVITY_ENTITY_TYPES,
        message: 'Invalid activity entity type',
      },
      required: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Main activity-feed query.
activitySchema.index({
  project: 1,
  createdAt: -1,
});

// Useful for organization-wide activity later.
activitySchema.index({
  organization: 1,
  createdAt: -1,
});

// Useful when looking for activity belonging to
// a particular entity.
activitySchema.index({
  entityType: 1,
  entityId: 1,
  createdAt: -1,
});

activitySchema.methods.toJSON = function toJSON() {
  const activity = this.toObject();

  delete activity.__v;

  return activity;
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;