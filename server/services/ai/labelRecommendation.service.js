import { generateAIResponse } from '../ai.service.js';

import ISSUE_LABEL_SYSTEM_INSTRUCTION from '../../prompts/ai/labelRecommendation.prompt.js';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LABELS = 5;

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

const validateTaskForLabelRecommendation = (task) => {
  if (!task) {
    const error = new Error(
      'Task is required for AI label recommendation.',
    );

    error.code = 'AI_TASK_REQUIRED';

    throw error;
  }

  const title = cleanText(task.title);

  if (!title) {
    const error = new Error(
      'Task title is required for AI label recommendation.',
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

  const existingLabels = getLabelNames(task.labels);

  return `
Recommend useful labels for the following SETU software
development task.

TASK TITLE:
${title}

TASK DESCRIPTION:
${description || 'No description provided.'}

CURRENT PRIORITY:
${currentPriority || 'Not specified'}

CURRENT STATUS:
${status || 'Not specified'}

EXISTING LABELS:
${
  existingLabels.length > 0
    ? existingLabels.join(', ')
    : 'No labels'
}

Recommend between 1 and 5 useful labels.

Labels must be:

- concise
- lowercase
- relevant to the task
- supported by the provided information
- non-duplicated

Do not modify the existing labels.

Return ONLY the required JSON format.
`.trim();
};

const extractJson = (text) => {
  if (!text || typeof text !== 'string') {
    const error = new Error(
      'AI returned an empty label recommendation.',
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
      'AI returned an invalid label recommendation format.',
    );

    error.code = 'AI_INVALID_RESPONSE_FORMAT';

    throw error;
  }
};

const validateLabelRecommendation = (result) => {
  if (!result || typeof result !== 'object') {
    const error = new Error(
      'AI label recommendation is invalid.',
    );

    error.code = 'AI_INVALID_LABELS';

    throw error;
  }

  if (!Array.isArray(result.labels)) {
    const error = new Error(
      'AI label recommendation must contain a labels array.',
    );

    error.code = 'AI_INVALID_LABELS';

    throw error;
  }

  if (
    result.labels.length < 1 ||
    result.labels.length > MAX_LABELS
  ) {
    const error = new Error(
      `AI must recommend between 1 and ${MAX_LABELS} labels.`,
    );

    error.code = 'AI_INVALID_LABEL_COUNT';

    throw error;
  }

  const seenLabels = new Set();

  const labels = result.labels.map((label) => {
    if (!label || typeof label !== 'object') {
      const error = new Error(
        'AI returned an invalid label entry.',
      );

      error.code = 'AI_INVALID_LABEL_ENTRY';

      throw error;
    }

    const name = cleanText(label.name).toLowerCase();
    const reason = cleanText(label.reason);

    if (!name) {
      const error = new Error(
        'AI returned a label without a name.',
      );

      error.code = 'AI_INCOMPLETE_LABEL';

      throw error;
    }

    if (!reason) {
      const error = new Error(
        `AI label "${name}" does not contain a reason.`,
      );

      error.code = 'AI_INCOMPLETE_LABEL';

      throw error;
    }

    if (seenLabels.has(name)) {
      const error = new Error(
        `AI returned duplicate label "${name}".`,
      );

      error.code = 'AI_DUPLICATE_LABEL';

      throw error;
    }

    seenLabels.add(name);

    return {
      name,
      reason,
    };
  });

  const confidence = cleanText(result.confidence).toLowerCase();

  const normalizedConfidence =
    ALLOWED_CONFIDENCE.includes(confidence)
      ? confidence
      : 'medium';

  return {
    labels,
    confidence: normalizedConfidence,
  };
};

export const recommendLabels = async (task) => {
  validateTaskForLabelRecommendation(task);

  const input = buildTaskInput(task);

  const result = await generateAIResponse({
    instructions: ISSUE_LABEL_SYSTEM_INSTRUCTION,
    input,
  });

  const parsedResult = extractJson(result.text);

  const recommendation =
    validateLabelRecommendation(parsedResult);

  return {
    recommendation,
    provider: result.provider,
    model: result.model,
  };
};