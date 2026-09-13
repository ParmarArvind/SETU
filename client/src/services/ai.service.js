import api from './api';

// ============================================================
// Generic AI request helper
// ============================================================

const getAIResult = async (
  endpoint,
  taskId,
) => {
  const response = await api.post(
    endpoint,
    {
      taskId,
    },
  );

  return response.data;
};

// ============================================================
// Issue analysis
// ============================================================

export const analyzeIssueWithAI = async (
  taskId,
) => {
  return getAIResult(
    '/ai/analyze-issue',
    taskId,
  );
};

// ============================================================
// Issue summary
// ============================================================

export const summarizeIssueWithAI = async (
  taskId,
) => {
  return getAIResult(
    '/ai/summarize',
    taskId,
  );
};

// ============================================================
// Priority recommendation
// ============================================================

export const recommendPriorityWithAI = async (
  taskId,
) => {
  return getAIResult(
    '/ai/recommend-priority',
    taskId,
  );
};

// ============================================================
// Label recommendation
// ============================================================

export const recommendLabelsWithAI = async (
  taskId,
) => {
  return getAIResult(
    '/ai/recommend-labels',
    taskId,
  );
};

// ============================================================
// Subtask generation
// ============================================================

export const generateSubtasksWithAI = async (
  taskId,
) => {
  return getAIResult(
    '/ai/generate-subtasks',
    taskId,
  );
};

// ============================================================
// Solution suggestions
// ============================================================

export const suggestSolutionsWithAI = async (
  taskId,
) => {
  return getAIResult(
    '/ai/suggest-solutions',
    taskId,
  );
};