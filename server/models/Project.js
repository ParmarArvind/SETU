import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Project name must be at least 2 characters'],
      maxlength: [100, 'Project name must be at most 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
      default: '',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Project must belong to an organization'],
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
      validate: {
        // Only checked when both dates are present — a project can
        // have a start date with no fixed end date.
        validator: function validateEndDate(value) {
          if (!value || !this.startDate) return true;
          return value >= this.startDate;
        },
        message: 'End date cannot be before start date',
      },
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project must record who created it'],
    },
  },
  {
    timestamps: true,
  }
);

// --------------------------------------------------------------
// Every list/dashboard query in Milestone 4+ filters by
// organization first, and usually by status too (default view
// excludes archived projects) — index the combination.
// --------------------------------------------------------------
projectSchema.index({ organization: 1, status: 1 });

projectSchema.methods.toJSON = function toJSON() {
  const project = this.toObject();
  delete project.__v;
  return project;
};

const Project = mongoose.model('Project', projectSchema);

export default Project;