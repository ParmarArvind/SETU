import mongoose from 'mongoose';

import Project from '../models/Project.js';
import OrganizationMember from '../models/OrganizationMember.js';
import ProjectMember from '../models/ProjectMember.js';

// --------------------------------------------------------------
// Roles that can see every project in their organization without
// needing an explicit ProjectMember record. Mirrors SRS §3.1/3.2:
// Owner and Admin manage the whole organization, so project-level
// visibility shouldn't be an extra gate for them.
//
// Every other role (Manager, Developer, QA, Viewer) must have a
// ProjectMember record for the specific project — this is what
// keeps "my assigned projects/tasks" meaningful once Phase 5 adds
// tasks scoped to project membership.
// --------------------------------------------------------------
const PROJECT_VISIBLE_TO_ALL_ROLES = ['owner', 'admin'];

// --------------------------------------------------------------
// loadProject
//
// Expects a project id at req.params.projectId (i.e. routes shaped
// like /api/projects/:projectId/...). Must run AFTER `protect`,
// since it relies on req.user.id.
//
// On success, attaches:
//   req.project           -> the Project document
//   req.organization       -> the Project's Organization document
//   req.membership          -> the caller's OrganizationMember document
//   req.projectMembership   -> the caller's ProjectMember document,
//                              or null if they qualify via
//                              PROJECT_VISIBLE_TO_ALL_ROLES instead
//                              of an explicit membership record
//
// This is the project-level counterpart to loadMembership
// (Phase 3, Milestone 3) — same shape, same "attach what's already
// been verified so controllers never re-query" philosophy.
// --------------------------------------------------------------
const loadProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // 1. Reject malformed ids before hitting the database.
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project id',
      });
    }

    // 2. Confirm the project exists, and pull its organization in
    //    the same query so we don't need a second round trip.
    const project = await Project.findById(projectId).populate('organization');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // 3. Confirm the caller belongs to the project's organization
    //    at all. This is the same tenancy check loadMembership does —
    //    a user with no relationship to the org gets 403, never data.
    const membership = await OrganizationMember.findOne({
      organization: project.organization._id,
      user: req.user.id,
      status: 'active',
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this project's organization",
      });
    }

    // 4. Project-level visibility rule (see PROJECT_VISIBLE_TO_ALL_ROLES
    //    above). Owner/Admin skip this; everyone else needs an
    //    explicit ProjectMember record.
    let projectMembership = null;

    if (!PROJECT_VISIBLE_TO_ALL_ROLES.includes(membership.role)) {
      projectMembership = await ProjectMember.findOne({
        project: project._id,
        user: req.user.id,
      });

      if (!projectMembership) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this project',
        });
      }
    }

    // 5. Attach for downstream middleware/controllers.
    req.project = project;
    req.organization = project.organization;
    req.membership = membership;
    req.projectMembership = projectMembership;

    next();
  } catch (error) {
    next(error);
  }
};

export { loadProject, PROJECT_VISIBLE_TO_ALL_ROLES };