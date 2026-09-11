const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const formatStatus = (status) => {
  if (!status) return 'Unknown';

  return (
    STATUS_LABELS[status] ||
    status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

export const formatPriority = (priority) => {
  if (!priority) return 'Unknown';

  return (
    PRIORITY_LABELS[priority] ||
    priority
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

export const formatAction = (action) => {
  if (!action) return 'Activity';

  return action
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getActivityIcon = (action) => {
  const icons = {
    'project.created': '📁',
    'project.updated': '✏️',
    'project.archived': '📦',
    'project.unarchived': '📂',
    'project.member_added': '👤',
    'project.member_removed': '👤',

    'task.created': '➕',
    'task.updated': '✏️',
    'task.assigned': '👤',
    'task.unassigned': '👤',
    'task.priority_changed': '⚡',
    'task.status_changed': '🔄',

    'comment.created': '💬',
    'comment.updated': '✏️',
    'comment.deleted': '🗑️',
  };

  return icons[action] || '•';
};

export const getActivityCategory = (action) => {
  if (!action) return 'other';

  if (action.startsWith('task.')) {
    return 'tasks';
  }

  if (action.startsWith('comment.')) {
    return 'comments';
  }

  if (action.startsWith('project.member_')) {
    return 'members';
  }

  if (action.startsWith('project.')) {
    return 'projects';
  }

  return 'other';
};

export const formatRelativeTime = (dateValue) => {
  if (!dateValue) return '';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();

  const diffInSeconds = Math.floor(
    (now.getTime() - date.getTime()) / 1000,
  );

  if (diffInSeconds < 0 || diffInSeconds < 10) {
    return 'just now';
  }

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }

  const minutes = Math.floor(diffInSeconds / 60);

  if (minutes < 60) {
    return `${minutes} ${
      minutes === 1 ? 'minute' : 'minutes'
    } ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${
      hours === 1 ? 'hour' : 'hours'
    } ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return 'yesterday';
  }

  if (days < 30) {
    return `${days} days ago`;
  }

  const months = Math.floor(days / 30);

  if (months < 12) {
    return `${months} ${
      months === 1 ? 'month' : 'months'
    } ago`;
  }

  const years = Math.floor(days / 365);

  return `${years} ${
    years === 1 ? 'year' : 'years'
  } ago`;
};

export const formatExactDate = (dateValue) => {
  if (!dateValue) return '';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString();
};

/*
 * Returns plain text instead of JSX.
 *
 * This file is .js, so keeping the formatter
 * JSX-free avoids Vite parser errors.
 */
export const getActivityDescription = (activity) => {
  const actorName =
    activity?.actor?.name ||
    activity?.actorName ||
    'Someone';

  const metadata = activity?.metadata || {};

  const taskTitle =
    metadata.taskTitle ||
    metadata.title ||
    'a task';

  switch (activity?.action) {
    case 'task.created':
      return `${actorName} created "${taskTitle}"`;

    case 'task.updated':
      return `${actorName} updated "${taskTitle}"`;

    case 'task.assigned':
      return `${actorName} assigned "${taskTitle}"`;

    case 'task.unassigned':
      return `${actorName} unassigned "${taskTitle}"`;

    case 'task.status_changed':
      return `${actorName} moved "${taskTitle}"`;

    case 'task.priority_changed':
      return `${actorName} changed priority of "${taskTitle}"`;

    case 'comment.created':
      return `${actorName} commented on "${taskTitle}"`;

    case 'comment.updated':
      return `${actorName} edited a comment on "${taskTitle}"`;

    case 'comment.deleted':
      return `${actorName} deleted a comment from "${taskTitle}"`;

    case 'project.created':
      return `${actorName} created the project`;

    case 'project.updated':
      return `${actorName} updated the project`;

    case 'project.archived':
      return `${actorName} archived the project`;

    case 'project.unarchived':
      return `${actorName} restored the project`;

    case 'project.member_added':
      return `${actorName} added a project member`;

    case 'project.member_removed':
      return `${actorName} removed a project member`;

    default:
      return `${actorName} ${formatAction(
        activity?.action,
      )}`;
  }
};