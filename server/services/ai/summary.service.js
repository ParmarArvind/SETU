import { generateAIResponse } from '../ai.service.js';

import ISSUE_SUMMARY_SYSTEM_INSTRUCTION from '../../prompts/ai/summary.prompt.js';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

const cleanText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const validateTaskForSummary = (task) => {
  if (!task) {
    const error = new Error(
      'Task is required for AI summary.',
    );

    error.code = 'AI_TASK_REQUIRED';

    throw error;
  }

  const title = cleanText(task.title);

  if (!title) {
    const error = new Error(
      'Task title is required for AI summary.',
    );

    error.code = 'AI_TASK_TITLE_REQUIRED';

    throw error;
  }

  if (title.length > MAX_TITLE_LENGTH) {
    const error = new Error(
      `Task title must be at most ${MAX_TITLE_LENGTH} characters.`,
    );

    error.code = 'AI_TASK_TITLE_TOO_LONG';

    throw error;
  }

  const description = cleanText(task.description);

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    const error = new Error(
      `Task description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
    );

    error.code = 'AI_TASK_DESCRIPTION_TOO_LONG';

    throw error;
  }
};

const getLabelNames = (labels = []) => {
  if (!Array.isArray(labels)) {
    return [];
  }

  return labels
    .map((label) => {
      if (typeof label === 'string') {
        return label.trim();
      }

      if (label && typeof label === 'object') {
        return cleanText(label.name);
      }

      return '';
    })
    .filter(Boolean);
};

const buildTaskInput = (task) => {
  const title = cleanText(task.title);
  const description = cleanText(task.description);

  const priority = cleanText(task.priority);
  const status = cleanText(task.status);

  const labels = getLabelNames(task.labels);

  return `
Summarize the following SETU software development task.

TASK TITLE:
${title}

TASK DESCRIPTION:
${description || 'No description provided.'}

CURRENT PRIORITY:
${priority || 'Not specified'}

CURRENT STATUS:
${status || 'Not specified'}

LABELS:
${labels.length > 0 ? labels.join(', ') : 'No labels'}

Create a concise summary based only on the information above.
`.trim();
};

export const summarizeIssue = async (task) => {
  validateTaskForSummary(task);

  const input = buildTaskInput(task);

  const result = await generateAIResponse({
    instructions: ISSUE_SUMMARY_SYSTEM_INSTRUCTION,
    input,
  });

  const summary = cleanText(result.text);

  if (!summary) {
    const error = new Error(
      'AI returned an empty issue summary.',
    );

    error.code = 'AI_EMPTY_SUMMARY';

    throw error;
  }

  return {
    summary,
    provider: result.provider,
    model: result.model,
  };
};