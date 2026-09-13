import { generateAIResponse } from '../ai.service.js';

import SUBTASK_GENERATION_SYSTEM_INSTRUCTION from '../../prompts/ai/subtaskGeneration.prompt.js';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MIN_SUBTASKS = 2;
const MAX_SUBTASKS = 10;
const MAX_SUBTASK_TITLE_LENGTH = 200;
const MAX_SUBTASK_DESCRIPTION_LENGTH = 1000;

const ALLOWED_CONFIDENCE = [
  'low',
  'medium',
  'high',
];

const cleanText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const validateTaskForSubtaskGeneration = (task) => {
  if (!task) {
    const error = new Error(
      'Task is required for AI subtask generation.',
    );

    error.code = 'AI_TASK_REQUIRED';

    throw error;
  }

  const title = cleanText(task.title);

  if (!title) {
    const error = new Error(
      'Task title is required for AI subtask generation.',
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
        return label.trim().toLowerCase();
      }

      if (label && typeof label === 'object') {
        return cleanText(label.name).toLowerCase();
      }

      return '';
    })
    .filter(Boolean);
};

const buildTaskInput = (task) => {
  const title = cleanText(task.title);
  const description = cleanText(task.description);
  const currentPriority = cleanText(task.priority);
  const status = cleanText(task.status);
  const labels = getLabelNames(task.labels);

  return `
Generate actionable subtasks for the following SETU software
development task.

MAIN TASK TITLE:
${title}

MAIN TASK DESCRIPTION:
${description || 'No description provided.'}

CURRENT PRIORITY:
${currentPriority || 'Not specified'}

CURRENT STATUS:
${status || 'Not specified'}

EXISTING LABELS:
${
  labels.length > 0
    ? labels.join(', ')
    : 'No labels'
}

Generate between ${MIN_SUBTASKS} and ${MAX_SUBTASKS} subtasks.

Each subtask must contain:

- title
- description

Subtasks must be actionable, concise, logically ordered,
non-duplicated, and supported by the task information.

Do not modify the original task.
Return ONLY the required JSON format.
`.trim();
};

const extractJson = (text) => {
  if (!text || typeof text !== 'string') {
    const error = new Error(
      'AI returned an empty subtask generation response.',
    );

    error.code = 'AI_EMPTY_RESPONSE';

    throw error;
  }

  let cleaned = text.trim();

  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      const candidate = cleaned.slice(
        firstBrace,
        lastBrace + 1,
      );

      try {
        return JSON.parse(candidate);
      } catch {
        // Continue to standardized error.
      }
    }

    const error = new Error(
      'AI returned an invalid subtask generation format.',
    );

    error.code = 'AI_INVALID_RESPONSE_FORMAT';

    throw error;
  }
};

const validateSubtaskGeneration = (result) => {
  if (!result || typeof result !== 'object') {
    const error = new Error(
      'AI subtask generation result is invalid.',
    );

    error.code = 'AI_INVALID_SUBTASKS';

    throw error;
  }

  if (!Array.isArray(result.subtasks)) {
    const error = new Error(
      'AI subtask generation must contain a subtasks array.',
    );

    error.code = 'AI_INVALID_SUBTASKS';

    throw error;
  }

  if (
    result.subtasks.length < MIN_SUBTASKS ||
    result.subtasks.length > MAX_SUBTASKS
  ) {
    const error = new Error(
      `AI must generate between ${MIN_SUBTASKS} and ${MAX_SUBTASKS} subtasks.`,
    );

    error.code = 'AI_INVALID_SUBTASK_COUNT';

    throw error;
  }

  const seenTitles = new Set();

  const subtasks = result.subtasks.map((subtask) => {
    if (!subtask || typeof subtask !== 'object') {
      const error = new Error(
        'AI returned an invalid subtask entry.',
      );

      error.code = 'AI_INVALID_SUBTASK_ENTRY';

      throw error;
    }

    const title = cleanText(subtask.title);
    const description = cleanText(subtask.description);

    if (!title) {
      const error = new Error(
        'AI returned a subtask without a title.',
      );

      error.code = 'AI_INCOMPLETE_SUBTASK';

      throw error;
    }

    if (title.length > MAX_SUBTASK_TITLE_LENGTH) {
      const error = new Error(
        `Subtask title must be at most ${MAX_SUBTASK_TITLE_LENGTH} characters.`,
      );

      error.code = 'AI_SUBTASK_TITLE_TOO_LONG';

      throw error;
    }

    if (!description) {
      const error = new Error(
        `Subtask "${title}" does not contain a description.`,
      );

      error.code = 'AI_INCOMPLETE_SUBTASK';

      throw error;
    }

    if (
      description.length > MAX_SUBTASK_DESCRIPTION_LENGTH
    ) {
      const error = new Error(
        `Subtask description must be at most ${MAX_SUBTASK_DESCRIPTION_LENGTH} characters.`,
      );

      error.code = 'AI_SUBTASK_DESCRIPTION_TOO_LONG';

      throw error;
    }

    const normalizedTitle = title.toLowerCase();

    if (seenTitles.has(normalizedTitle)) {
      const error = new Error(
        `AI returned duplicate subtask "${title}".`,
      );

      error.code = 'AI_DUPLICATE_SUBTASK';

      throw error;
    }

    seenTitles.add(normalizedTitle);

    return {
      title,
      description,
    };
  });

  const confidence = cleanText(result.confidence).toLowerCase();

  const normalizedConfidence =
    ALLOWED_CONFIDENCE.includes(confidence)
      ? confidence
      : 'medium';

  return {
    subtasks,
    confidence: normalizedConfidence,
  };
};

export const generateSubtasks = async (task) => {
  validateTaskForSubtaskGeneration(task);

  const input = buildTaskInput(task);

  const result = await generateAIResponse({
    instructions: SUBTASK_GENERATION_SYSTEM_INSTRUCTION,
    input,
  });

  const parsedResult = extractJson(result.text);

  const recommendation = validateSubtaskGeneration(
    parsedResult,
  );

  return {
    recommendation,
    provider: result.provider,
    model: result.model,
  };
};