import mongoose from 'mongoose';

const projectMemberSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project membership must reference a project'],
    },
    // Denormalized from Project.organization. This is deliberate:
    // it lets loadProject (Milestone 2) and any project-membership
    // query filter/verify by organization without a second lookup
    // or a populate() just to check tenancy. Always set this from
    // the parent Project document when creating a record here —
    // never take it from client input.
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Project membership must record its organization'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project membership must reference a user'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// A user can only be added to a given project once.
projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });

// Fast lookups: "all members of project X" and "all projects user Y is on"
projectMemberSchema.index({ project: 1 });
projectMemberSchema.index({ user: 1 });

projectMemberSchema.methods.toJSON = function toJSON() {
  const member = this.toObject();
  delete member.__v;
  return member;
};

const ProjectMember = mongoose.model('ProjectMember', projectMemberSchema);

export default ProjectMember;