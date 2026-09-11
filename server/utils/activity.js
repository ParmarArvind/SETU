import Activity from '../models/Activity.js';

export const logActivity = async ({
  organization,
  project,
  actor,
  action,
  entityType,
  entityId,
  metadata = {},
}) => {
  try {
    return await Activity.create({
      organization,
      project,
      actor,
      action,
      entityType,
      entityId,
      metadata,
    });
  } catch (error) {
    console.error(
      '[Activity] Failed to record activity:',
      error.message,
    );

    // Activity logging must never break
    // the original operation.
    return null;
  }
};