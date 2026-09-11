import { logActivity } from '../utils/activity.js';

/*
 * Compare MongoDB ObjectIds, strings, null and undefined safely.
 *
 * Example:
 * ObjectId("123") === "123"  -> true
 */
const sameId = (first, second) => {
  if (first == null && second == null) {
    return true;
  }

  if (first == null || second == null) {
    return false;
  }

  return String(first) === String(second);
};

const activityTracker = async (req, res, next) => {
  /*
   * We need the operation to finish first so that:
   *
   * 1. The controller can update the database.
   * 2. We can check whether the operation actually succeeded.
   * 3. We can then create the activity record.
   */
  const originalJson = res.json.bind(res);

  res.json = async (body) => {
    try {
      /*
       * Only create activity when the API operation succeeded.
       */
      if (
        res.statusCode >= 200 &&
        res.statusCode < 300
      ) {
        let action = null;
        let entityType = null;
        let entityId = null;
        let project = null;
        let organization = null;
        let metadata = {};

        /*
         * -------------------------------------------------------
         * TASK CREATED
         * -------------------------------------------------------
         */
        if (
          req.method === 'POST' &&
          req.baseUrl.includes('/projects') &&
          req.path === '/tasks'
        ) {
          action = 'task.created';

          entityType = 'task';
          entityId =
            body?.data?.task?._id ||
            body?.task?._id;

          project =
            req.project?._id ||
            req.body?.project;

          organization =
            req.organization?._id;

          metadata = {
            taskTitle:
              body?.data?.task?.title ||
              body?.task?.title ||
              req.body?.title,
          };
        }

        /*
         * -------------------------------------------------------
         * TASK ASSIGNED / UNASSIGNED
         * -------------------------------------------------------
         *
         * IMPORTANT:
         *
         * Do not create an activity when the selected assignee
         * is already the current assignee.
         */
        else if (
          req.method === 'PATCH' &&
          req.path.includes('/assignee')
        ) {
          const previousAssignee =
            req.activityPreviousTaskAssignee ||
            null;

          const nextAssignee =
            req.body?.assignee || null;

          /*
           * If nothing actually changed, don't create an
           * activity entry.
           *
           * This prevents:
           *
           * Dinesh assigned login feature
           * Dinesh assigned login feature
           * Dinesh assigned login feature
           */
          if (
            sameId(
              previousAssignee,
              nextAssignee,
            )
          ) {
            return originalJson(body);
          }

          action = nextAssignee
            ? 'task.assigned'
            : 'task.unassigned';

          entityType = 'task';

          entityId =
            req.task?._id ||
            body?.data?.task?._id ||
            body?.task?._id;

          project =
            req.project?._id ||
            req.task?.project;

          organization =
            req.organization?._id;

          metadata = {
            taskTitle:
              req.task?.title ||
              body?.data?.task?.title ||
              body?.task?.title,

            assignee: nextAssignee,

            previousAssignee,
          };
        }

        /*
         * -------------------------------------------------------
         * TASK STATUS CHANGED
         * -------------------------------------------------------
         */
        else if (
          req.method === 'PATCH' &&
          req.path.includes('/status')
        ) {
          const previousStatus =
            req.activityPreviousTaskStatus;

          const nextStatus =
            req.body?.status;

          /*
           * Don't create activity if status didn't actually
           * change.
           */
          if (
            previousStatus === nextStatus
          ) {
            return originalJson(body);
          }

          action =
            'task.status_changed';

          entityType = 'task';

          entityId =
            req.task?._id ||
            body?.data?.task?._id ||
            body?.task?._id;

          project =
            req.project?._id ||
            req.task?.project;

          organization =
            req.organization?._id;

          metadata = {
            taskTitle:
              req.task?.title ||
              body?.data?.task?.title ||
              body?.task?.title,

            previousStatus,

            newStatus: nextStatus,
          };
        }

        /*
         * -------------------------------------------------------
         * TASK PRIORITY CHANGED
         * -------------------------------------------------------
         */
        else if (
          req.method === 'PATCH' &&
          req.path.includes('/priority')
        ) {
          const previousPriority =
            req.activityPreviousTaskPriority;

          const nextPriority =
            req.body?.priority;

          /*
           * Don't create activity if priority didn't actually
           * change.
           */
          if (
            previousPriority === nextPriority
          ) {
            return originalJson(body);
          }

          action =
            'task.priority_changed';

          entityType = 'task';

          entityId =
            req.task?._id ||
            body?.data?.task?._id ||
            body?.task?._id;

          project =
            req.project?._id ||
            req.task?.project;

          organization =
            req.organization?._id;

          metadata = {
            taskTitle:
              req.task?.title ||
              body?.data?.task?.title ||
              body?.task?.title,

            previousPriority,

            newPriority: nextPriority,
          };
        }

        /*
         * -------------------------------------------------------
         * TASK UPDATED
         * -------------------------------------------------------
         */
        else if (
          req.method === 'PATCH' &&
          req.task
        ) {
          action = 'task.updated';

          entityType = 'task';

          entityId =
            req.task._id;

          project =
            req.project?._id ||
            req.task.project;

          organization =
            req.organization?._id;

          metadata = {
            taskTitle:
              req.task.title,
          };
        }

        /*
         * -------------------------------------------------------
         * PROJECT CREATED
         * -------------------------------------------------------
         */
        else if (
          req.method === 'POST' &&
          req.path === '/projects'
        ) {
          action = 'project.created';

          entityType = 'project';

          entityId =
            body?.data?.project?._id ||
            body?.project?._id;

          organization =
            req.organization?._id;

          metadata = {
            projectName:
              body?.data?.project?.name ||
              body?.project?.name ||
              req.body?.name,
          };
        }

        /*
         * -------------------------------------------------------
         * PROJECT UPDATED
         * -------------------------------------------------------
         */
        else if (
          req.method === 'PATCH' &&
          req.project
        ) {
          action = 'project.updated';

          entityType = 'project';

          entityId =
            req.project._id;

          organization =
            req.organization?._id ||
            req.project.organization;

          metadata = {
            projectName:
              req.project.name,
          };
        }

        /*
         * -------------------------------------------------------
         * ORGANIZATION UPDATED
         * -------------------------------------------------------
         */
        else if (
          req.method === 'PATCH' &&
          req.organization &&
          !req.project
        ) {
          action =
            'organization.updated';

          entityType =
            'organization';

          entityId =
            req.organization._id;

          organization =
            req.organization._id;

          metadata = {
            organizationName:
              req.organization.name,
          };
        }

        /*
         * -------------------------------------------------------
         * CREATE ACTIVITY
         * -------------------------------------------------------
         */
        if (
          action &&
          entityType &&
          entityId
        ) {
          try {
            await logActivity({
              user: req.user?.id,
              organization,
              project,
              action,
              entityType,
              entityId,
              metadata,
            });
          } catch (activityError) {
            /*
             * Activity logging must NEVER make the main
             * operation fail.
             */
            console.error(
              '[Activity] Failed to create activity:',
              activityError.message,
            );
          }
        }
      }
    } catch (activityError) {
      /*
       * Never allow an activity-tracking error to break
       * the actual API response.
       */
      console.error(
        '[Activity] Tracking error:',
        activityError.message,
      );
    }

    return originalJson(body);
  };

  next();
};

export default activityTracker;