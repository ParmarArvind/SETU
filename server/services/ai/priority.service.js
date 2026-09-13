import { generateAIResponse } from '../ai.service.js';

import ISSUE_PRIORITY_SYSTEM_INSTRUCTION from '../../prompts/ai/priority.prompt.js';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

const ALLOWED_PRIORITIES = [
  'low',
  'medium',
  'high',
  'critical',
];

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

const validateTaskForPriority = (task) => {
  if (!task) {
    const error = new Error(
      'Task is required for AI priority recommendation.',
    );

    error.code = 'AI_TASK_REQUIRED';

    throw error;
  }

  const title = cleanText(task.title);

  if (!title) {
    const error = new Error(
      'Task title is required for AI priority recommendation.',
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
  const currentPriority = cleanText(task.priority);
  const status = cleanText(task.status);

  const labels = getLabelNames(task.labels);

  return `
Recommend a priority for the following SETU software development task.

TASK TITLE:
${title}

TASK DESCRIPTION:
${description || 'No description provided.'}

CURRENT PRIORITY:
${currentPriority || 'Not specified'}

CURRENT STATUS:
${status || 'Not specified'}

LABELS:
${labels.length > 0 ? labels.join(', ') : 'No labels'}

Analyze the task and recommend exactly one priority from:

low
medium
high
critical

Base the recommendation only on the provided information.
Do not modify the current priority.
`.trim();
};

const extractJson = (text) => {
  if (!text || typeof text !== 'string') {
    const error = new Error(
      'AI returned an empty priority recommendation.',
    );

    error.code = 'AI_EMPTY_RESPONSE';

    throw error;
  }

  let cleaned = text.trim();

  // Remove markdown code fences if Gemini adds them.
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting a JSON object if Gemini added surrounding text.
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
      'AI returned an invalid priority recommendation format.',
    );

    error.code = 'AI_INVALID_RESPONSE_FORMAT';

    throw error;
  }
};

const validatePriorityRecommendation = (result) => {
  if (!result || typeof result !== 'object') {
    const error = new Error(
      'AI priority recommendation is invalid.',
    );

    error.code = 'AI_INVALID_PRIORITY';

    throw error;
  }

  const priority = cleanText(result.priority).toLowerCase();
  const reason = cleanText(result.reason);

  const confidence = cleanText(result.confidence).toLowerCase();

  if (!ALLOWED_PRIORITIES.includes(priority)) {
    const error = new Error(
      'AI returned an unsupported priority.',
    );

    error.code = 'AI_UNSUPPORTED_PRIORITY';

    throw error;
  }

  if (!reason) {
    const error = new Error(
      'AI priority recommendation does not contain a reason.',
    );

    error.code = 'AI_INCOMPLETE_PRIORITY';

    throw error;
  }

  const normalizedConfidence = ALLOWED_CONFIDENCE.includes(
    confidence,
  )
    ? confidence
    : 'medium';

  return {
    priority,
    reason,
    confidence: normalizedConfidence,
  };
};

export const recommendPriority = async (task) => {
  validateTaskForPriority(task);

  const input = buildTaskInput(task);

  const result = await generateAIResponse({
    instructions: ISSUE_PRIORITY_SYSTEM_INSTRUCTION,
    input,
  });

  const parsedResult = extractJson(result.text);

  const recommendation =
    validatePriorityRecommendation(parsedResult);

  return {
    recommendation,
    provider: result.provider,
    model: result.model,
  };
};