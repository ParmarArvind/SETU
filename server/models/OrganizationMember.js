import mongoose from 'mongoose';

// --------------------------------------------------------------
// Roles supported across DevSync/SETU (SRS Section 3).
// Order below is highest → lowest privilege; the RBAC middleware
// (Milestone 3) will rely on this same list for hierarchy checks.
// --------------------------------------------------------------
export const ORG_ROLES = ['owner', 'admin', 'manager', 'developer', 'qa', 'viewer'];

const organizationMemberSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Membership must reference an organization'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Membership must reference a user'],
    },
    role: {
      type: String,
      enum: {
        values: ORG_ROLES,
        message: 'Role must be one of: ' + ORG_ROLES.join(', '),
      },
      default: 'developer',
      required: [true, 'Role is required'],
    },
    status: {
      type: String,
      enum: ['active', 'invited'],
      default: 'active',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// --------------------------------------------------------------
// A user can only have ONE membership record per organization.
// This is the constraint that keeps roles unambiguous and is
// relied on by the "prevent zero owners" checks in later milestones.
// --------------------------------------------------------------
organizationMemberSchema.index({ organization: 1, user: 1 }, { unique: true });

// Fast lookups: "all members of org X" and "all orgs user Y belongs to"
organizationMemberSchema.index({ organization: 1, role: 1 });
organizationMemberSchema.index({ user: 1 });

organizationMemberSchema.methods.toJSON = function toJSON() {
  const member = this.toObject();
  delete member.__v;
  return member;
};

const OrganizationMember = mongoose.model('OrganizationMember', organizationMemberSchema);

export default OrganizationMember;