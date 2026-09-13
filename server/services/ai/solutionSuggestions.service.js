import { generateAIResponse } from '../ai.service.js';

import SOLUTION_SUGGESTIONS_SYSTEM_INSTRUCTION from '../../prompts/ai/solutionSuggestions.prompt.js';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

const MIN_SUGGESTIONS = 1;
const MAX_SUGGESTIONS = 5;

const MIN_STEPS = 2;
const MAX_STEPS = 5;

const MAX_SUGGESTION_TITLE_LENGTH = 200;
const MAX_SUGGESTION_DESCRIPTION_LENGTH = 1000;
const MAX_STEP_LENGTH = 500;

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

const validateTaskForSolutionSuggestions = (task) => {
  if (!task) {
    const error = new Error(
      'Task is required for AI solution suggestions.',
    );

    error.code = 'AI_TASK_REQUIRED';

    throw error;
  }

  const title = cleanText(task.title);

  if (!title) {
    const error = new Error(
      'Task title is required for AI solution suggestions.',
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
  const priority = cleanText(task.priority);
  const status = cleanText(task.status);
  const labels = getLabelNames(task.labels);

  return `
Suggest practical technical solutions or investigation directions
for the following SETU software development task.

TASK TITLE:
${title}

TASK DESCRIPTION:
${description || 'No description provided.'}

CURRENT PRIORITY:
${priority || 'Not specified'}

CURRENT STATUS:
${status || 'Not specified'}

EXISTING LABELS:
${
  labels.length > 0
    ? labels.join(', ')
    : 'No labels'
}

Generate between ${MIN_SUGGESTIONS} and ${MAX_SUGGESTIONS}
solution suggestions.

Each suggestion must contain:

- title
- description
- steps

Each steps array must contain between ${MIN_STEPS} and ${MAX_STEPS}
clear, actionable steps.

Base the suggestions only on the provided task information.
Do not modify the original task.
Return ONLY the required JSON format.
`.trim();
};

const extractJson = (text) => {
  if (!text || typeof text !== 'string') {
    const error = new Error(
      'AI returned an empty solution suggestions response.',
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
      'AI returned an invalid solution suggestions format.',
    );

    error.code = 'AI_INVALID_RESPONSE_FORMAT';

    throw error;
  }
};

const validateSolutionSuggestions = (result) => {
  if (!result || typeof result !== 'object') {
    const error = new Error(
      'AI solution suggestions result is invalid.',
    );

    error.code = 'AI_INVALID_SUGGESTIONS';

    throw error;
  }

  if (!Array.isArray(result.suggestions)) {
    const error = new Error(
      'AI solution suggestions must contain a suggestions array.',
    );

    error.code = 'AI_INVALID_SUGGESTIONS';

    throw error;
  }

  if (
    result.suggestions.length < MIN_SUGGESTIONS ||
    result.suggestions.length > MAX_SUGGESTIONS
  ) {
    const error = new Error(
      `AI must generate between ${MIN_SUGGESTIONS} and ${MAX_SUGGESTIONS} suggestions.`,
    );

    error.code = 'AI_INVALID_SUGGESTION_COUNT';

    throw error;
  }

  const seenTitles = new Set();

  const suggestions = result.suggestions.map((suggestion) => {
    if (!suggestion || typeof suggestion !== 'object') {
      const error = new Error(
        'AI returned an invalid solution suggestion entry.',
      );

      error.code = 'AI_INVALID_SUGGESTION_ENTRY';

      throw error;
    }

    const title = cleanText(suggestion.title);
    const description = cleanText(suggestion.description);

    if (!title) {
      const error = new Error(
        'AI returned a solution suggestion without a title.',
      );

      error.code = 'AI_INCOMPLETE_SUGGESTION';

      throw error;
    }

    if (title.length > MAX_SUGGESTION_TITLE_LENGTH) {
      const error = new Error(
        `Solution suggestion title must be at most ${MAX_SUGGESTION_TITLE_LENGTH} characters.`,
      );

      error.code = 'AI_SUGGESTION_TITLE_TOO_LONG';

      throw error;
    }

    if (!description) {
      const error = new Error(
        `Solution suggestion "${title}" does not contain a description.`,
      );

      error.code = 'AI_INCOMPLETE_SUGGESTION';

      throw error;
    }

    if (
      description.length > MAX_SUGGESTION_DESCRIPTION_LENGTH
    ) {
      const error = new Error(
        `Solution suggestion description must be at most ${MAX_SUGGESTION_DESCRIPTION_LENGTH} characters.`,
      );

      error.code = 'AI_SUGGESTION_DESCRIPTION_TOO_LONG';

      throw error;
    }

    if (!Array.isArray(suggestion.steps)) {
      const error = new Error(
        `Solution suggestion "${title}" must contain a steps array.`,
      );

      error.code = 'AI_INVALID_SUGGESTION_STEPS';

      throw error;
    }

    if (
      suggestion.steps.length < MIN_STEPS ||
      suggestion.steps.length > MAX_STEPS
    ) {
      const error = new Error(
        `Solution suggestion "${title}" must contain between ${MIN_STEPS} and ${MAX_STEPS} steps.`,
      );

      error.code = 'AI_INVALID_STEP_COUNT';

      throw error;
    }

    const normalizedTitle = title.toLowerCase();

    if (seenTitles.has(normalizedTitle)) {
      const error = new Error(
        `AI returned duplicate solution suggestion "${title}".`,
      );

      error.code = 'AI_DUPLICATE_SUGGESTION';

      throw error;
    }

    seenTitles.add(normalizedTitle);

    const steps = suggestion.steps.map((step) => {
      const cleanedStep = cleanText(step);

      if (!cleanedStep) {
        const error = new Error(
          `Solution suggestion "${title}" contains an empty step.`,
        );

        error.code = 'AI_INCOMPLETE_STEP';

        throw error;
      }

      if (cleanedStep.length > MAX_STEP_LENGTH) {
        const error = new Error(
          `Each solution step must be at most ${MAX_STEP_LENGTH} characters.`,
        );

        error.code = 'AI_STEP_TOO_LONG';

        throw error;
      }

      return cleanedStep;
    });

    return {
      title,
      description,
      steps,
    };
  });

  const confidence = cleanText(result.confidence).toLowerCase();

  const normalizedConfidence =
    ALLOWED_CONFIDENCE.includes(confidence)
      ? confidence
      : 'medium';

  return {
    suggestions,
    confidence: normalizedConfidence,
  };
};

export const suggestSolutions = async (task) => {
  validateTaskForSolutionSuggestions(task);

  const input = buildTaskInput(task);

  const result = await generateAIResponse({
    instructions: SOLUTION_SUGGESTIONS_SYSTEM_INSTRUCTION,
    input,
  });

  const parsedResult = extractJson(result.text);

  const recommendation = validateSolutionSuggestions(
    parsedResult,
  );

  return {
    recommendation,
    provider: result.provider,
    model: result.model,
  };
};