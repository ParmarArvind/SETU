import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Comment must belong to a task'],
      index: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Comment must belong to a project'],
      index: true,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Comment must belong to an organization'],
      index: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment must have an author'],
    },

    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [2000, 'Comment must be at most 2000 characters'],
    },
  },
  {
    timestamps: true,
  },
);

// Most common query:
// comments for one task ordered by creation time.
commentSchema.index({ task: 1, createdAt: 1 });

// Useful for project-level activity/comment queries later.
commentSchema.index({ project: 1, createdAt: -1 });

// Useful for organization-level isolation queries.
commentSchema.index({ organization: 1, createdAt: -1 });

commentSchema.methods.toJSON = function toJSON() {
  const comment = this.toObject();

  delete comment.__v;

  return comment;
};

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;