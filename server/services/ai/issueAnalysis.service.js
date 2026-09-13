import { generateAIResponse } from '../ai.service.js';
import ISSUE_ANALYSIS_SYSTEM_INSTRUCTION from '../../prompts/ai/issueAnalysis.prompt.js';

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

const cleanText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const validateTaskForAnalysis = (task) => {
  if (!task) {
    const error = new Error(
      'Task is required for AI analysis.',
    );

    error.code = 'AI_TASK_REQUIRED';

    throw error;
  }

  const title = cleanText(task.title);

  if (!title) {
    const error = new Error(
      'Task title is required for AI analysis.',
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

const getAssigneeName = (assignee) => {
  if (!assignee) {
    return 'Unassigned';
  }

  if (typeof assignee === 'string') {
    return assignee;
  }

  if (typeof assignee === 'object') {
    return (
      cleanText(assignee.name) ||
      cleanText(assignee.username) ||
      cleanText(assignee.email) ||
      'Assigned user'
    );
  }

  return 'Unassigned';
};

const buildTaskInput = (task) => {
  const title = cleanText(task.title);
  const description = cleanText(task.description);

  const priority = cleanText(task.priority);
  const status = cleanText(task.status);

  const labels = getLabelNames(task.labels);

  const assignee = getAssigneeName(task.assignee);

  return `
Analyze the following SETU software development task.

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

ASSIGNEE:
${assignee}

Analyze only the information provided above.
Do not invent implementation details that are not present.
Do not modify or assume any task data.

Return ONLY valid JSON.
`.trim();
};

const extractJson = (text) => {
  if (!text || typeof text !== 'string') {
    const error = new Error(
      'AI returned an empty analysis response.',
    );

    error.code = 'AI_EMPTY_RESPONSE';

    throw error;
  }

  let cleaned = text.trim();

  // Remove markdown code fences if Gemini returns them.
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting the first JSON object from the response.
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonCandidate = cleaned.slice(
        firstBrace,
        lastBrace + 1,
      );

      try {
        return JSON.parse(jsonCandidate);
      } catch {
        // Fall through to standardized error below.
      }
    }

    const error = new Error(
      'AI returned an invalid analysis format.',
    );

    error.code = 'AI_INVALID_RESPONSE_FORMAT';

    throw error;
  }
};

const validateAnalysis = (analysis) => {
  if (!analysis || typeof analysis !== 'object') {
    const error = new Error(
      'AI analysis response is invalid.',
    );

    error.code = 'AI_INVALID_ANALYSIS';

    throw error;
  }

  const summary = cleanText(analysis.summary);
  const problem = cleanText(analysis.problem);

  const possibleCauses = Array.isArray(
    analysis.possibleCauses,
  )
    ? analysis.possibleCauses
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const recommendations = Array.isArray(
    analysis.recommendations,
  )
    ? analysis.recommendations
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const confidence = ['low', 'medium', 'high'].includes(
    analysis.confidence,
  )
    ? analysis.confidence
    : 'medium';

  if (!summary || !problem) {
    const error = new Error(
      'AI analysis did not contain the required summary or problem.',
    );

    error.code = 'AI_INCOMPLETE_ANALYSIS';

    throw error;
  }

  return {
    summary,
    problem,
    possibleCauses,
    recommendations,
    confidence,
  };
};

export const analyzeIssue = async (task) => {
  validateTaskForAnalysis(task);

  const input = buildTaskInput(task);

  const result = await generateAIResponse({
    instructions: ISSUE_ANALYSIS_SYSTEM_INSTRUCTION,
    input,
  });

  const parsedAnalysis = extractJson(result.text);

  const analysis = validateAnalysis(parsedAnalysis);

  return {
    analysis,
    provider: result.provider,
    model: result.model,
  };
};