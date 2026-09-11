import { logActivity } from '../utils/activity.js';

const getId = (value) => {
  if (!value) return null;

  if (typeof value === 'object' && value._id) {
    return value._id;
  }

  return value;
};

const getProjectFromResponse = (body) => {
  return (
    body?.data?.project ||
    body?.data?.membership?.project ||
    body?.data?.task?.project ||
    null
  );
};

const activityTracker = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const response = originalJson(body);

    // Only track successful mutating requests.
    if (
      res.statusCode >= 200 &&
      res.statusCode < 300 &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(
        req.method,
      )
    ) {
      // Do not delay the response.
      setImmediate(() => {
        recordActivity(req, body).catch((error) => {
          console.error(
            '[Activity] Unexpected tracking error:',
            error.message,
          );
        });
      });
    }

    return response;
  };

  next();
};

const recordActivity = async (req, body) => {
  const actor = req.user?.id;

  if (!actor) {
    return;
  }

  let action = null;
  let entityType = null;
  let entityId = null;
  let project = null;
  let organization = null;
  let metadata = {};

  // ============================================================
  // PROJECT ROUTES
  // ============================================================

  if (
    req.baseUrl === '/api/organizations' &&
    req.route?.path === '/:id/projects' &&
    req.method === 'POST'
  ) {
    const createdProject = getProjectFromResponse(body);

    if (!createdProject) {
      return;
    }

    action = 'project.created';
    entityType = 'project';
    entityId = createdProject._id;
    project = createdProject._id;
    organization = req.organization?._id;

    metadata = {
      projectName: createdProject.name,
    };
  }

  else if (
    req.baseUrl === '/api/projects' &&
    req.route?.path === '/:projectId' &&
    req.method === 'PATCH'
  ) {
    action = 'project.updated';
    entityType = 'project';
    entityId = req.project?._id;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      projectName: req.project?.name,
      changedFields: Object.keys(req.body || {}),
    };
  }

  else if (
    req.baseUrl === '/api/projects' &&
    req.route?.path === '/:projectId/archive' &&
    req.method === 'PATCH'
  ) {
    action = 'project.archived';
    entityType = 'project';
    entityId = req.project?._id;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      projectName: req.project?.name,
    };
  }

  else if (
    req.baseUrl === '/api/projects' &&
    req.route?.path === '/:projectId/unarchive' &&
    req.method === 'PATCH'
  ) {
    action = 'project.unarchived';
    entityType = 'project';
    entityId = req.project?._id;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      projectName: req.project?.name,
    };
  }

  // ============================================================
  // PROJECT MEMBER ROUTES
  // ============================================================

  else if (
    req.baseUrl === '/api/projects' &&
    req.route?.path === '/:projectId/members' &&
    req.method === 'POST'
  ) {
    const membership = body?.data?.membership;

    action = 'project.member_added';
    entityType = 'project_member';
    entityId = membership?._id || req.body?.userId;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      userId: req.body?.userId,
      userName: membership?.user?.name || null,
    };
  }

  else if (
    req.baseUrl === '/api/projects' &&
    req.route?.path === '/:projectId/members/:memberId' &&
    req.method === 'DELETE'
  ) {
    action = 'project.member_removed';
    entityType = 'project_member';
    entityId = req.params.memberId;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      memberId: req.params.memberId,
    };
  }

  // ============================================================
  // TASK CREATION
  // ============================================================

  else if (
    req.baseUrl === '/api/projects' &&
    req.route?.path === '/:projectId/tasks' &&
    req.method === 'POST'
  ) {
    const task = body?.data?.task;

    if (!task) {
      return;
    }

    action = 'task.created';
    entityType = 'task';
    entityId = task._id;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      taskTitle: task.title,
    };
  }

  // ============================================================
  // TASK GENERIC UPDATE
  // ============================================================

  else if (
    req.baseUrl === '/api/tasks' &&
    req.route?.path === '/:taskId' &&
    req.method === 'PATCH'
  ) {
    action = 'task.updated';
    entityType = 'task';
    entityId = req.task?._id;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      taskTitle: req.task?.title,
      changedFields: Object.keys(req.body || {}),
    };
  }

  // ============================================================
  // TASK ASSIGNMENT
  // ============================================================

  else if (
    req.baseUrl === '/api/tasks' &&
    req.route?.path === '/:taskId/assign' &&
    req.method === 'PATCH'
  ) {
    const newAssignee = getId(req.body?.assignee);
    const oldAssignee = getId(req.task?.assignee);

    action = newAssignee
      ? 'task.assigned'
      : 'task.unassigned';

    entityType = 'task';
    entityId = req.task?._id;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      taskTitle: req.task?.title,
      previousAssignee: oldAssignee,
      newAssignee,
    };
  }

  // ============================================================
  // TASK PRIORITY
  // ============================================================

  else if (
    req.baseUrl === '/api/tasks' &&
    req.route?.path === '/:taskId/priority' &&
    req.method === 'PATCH'
  ) {
    action = 'task.priority_changed';
    entityType = 'task';
    entityId = req.task?._id;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      taskTitle: req.task?.title,
      previousPriority: req.task?.priority,
      newPriority: req.body?.priority,
    };
  }

  // ============================================================
  // TASK STATUS
  // ============================================================

  else if (
    req.baseUrl === '/api/tasks' &&
    req.route?.path === '/:taskId/status' &&
    req.method === 'PATCH'
  ) {
    action = 'task.status_changed';
    entityType = 'task';
    entityId = req.task?._id;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      taskTitle: req.task?.title,
      previousStatus: req.task?.status,
      newStatus: req.body?.status,
    };
  }

  // ============================================================
  // COMMENTS
  // ============================================================

  else if (
    req.baseUrl === '/api' &&
    req.route?.path === '/tasks/:taskId/comments' &&
    req.method === 'POST'
  ) {
    const comment = body?.data?.comment || body?.data;

    if (!comment) {
      return;
    }

    action = 'comment.created';
    entityType = 'comment';
    entityId = comment._id;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      taskId: req.task?._id,
      taskTitle: req.task?.title,
      preview: req.body?.content
        ? req.body.content.trim().slice(0, 120)
        : '',
    };
  }

  else if (
    req.baseUrl === '/api' &&
    req.route?.path ===
      '/tasks/:taskId/comments/:commentId' &&
    req.method === 'PATCH'
  ) {
    action = 'comment.updated';
    entityType = 'comment';
    entityId = req.params.commentId;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      taskId: req.task?._id,
      taskTitle: req.task?.title,
      preview: req.body?.content
        ? req.body.content.trim().slice(0, 120)
        : '',
    };
  }

  else if (
    req.baseUrl === '/api' &&
    req.route?.path ===
      '/tasks/:taskId/comments/:commentId' &&
    req.method === 'DELETE'
  ) {
    action = 'comment.deleted';
    entityType = 'comment';
    entityId = req.params.commentId;
    project = req.project?._id;
    organization = req.organization?._id;

    metadata = {
      taskId: req.task?._id,
      taskTitle: req.task?.title,
    };
  }

  if (
    !action ||
    !entityType ||
    !entityId ||
    !project ||
    !organization
  ) {
    return;
  }

  await logActivity({
    organization,
    project,
    actor,
    action,
    entityType,
    entityId,
    metadata,
  });
};

export default activityTracker;