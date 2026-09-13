import {
  isAIAvailable,
  generateAIResponse,
} from '../services/ai.service.js';

import { analyzeIssue } from '../services/ai/issueAnalysis.service.js';
import { summarizeIssue } from '../services/ai/summary.service.js';
import { recommendPriority } from '../services/ai/priority.service.js';
import { recommendLabels } from '../services/ai/labelRecommendation.service.js';
import { generateSubtasks } from '../services/ai/subtaskGeneration.service.js';
import { suggestSolutions } from '../services/ai/solutionSuggestions.service.js';

import {
  sendAISuccess,
  sendAIError,
} from '../utils/aiResponse.js';

export const getAIStatus = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        available: isAIAvailable(),
        provider: 'gemini',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const testAI = async (req, res, next) => {
  try {
    if (!isAIAvailable()) {
      return sendAIError({
        res,
        statusCode: 503,
        code: 'AI_NOT_CONFIGURED',
        message: 'AI service is not configured.',
      });
    }

    const { prompt } = req.body;

    if (
      !prompt ||
      typeof prompt !== 'string' ||
      !prompt.trim()
    ) {
      return sendAIError({
        res,
        statusCode: 400,
        code: 'AI_INVALID_INPUT',
        message: 'Prompt is required.',
      });
    }

    const result = await generateAIResponse({
      instructions:
        'You are the AI assistant for SETU, a developer collaboration and project management platform. Give concise, accurate, and useful technical responses.',
      input: prompt.trim(),
    });

    return sendAISuccess({
      res,
      taskId: null,
      operation: 'test',
      result: {
        response: result.text,
      },
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error('[AI] Test request failed:', error);

    if (error?.code === 'AI_NOT_CONFIGURED') {
      return sendAIError({
        res,
        statusCode: 503,
        code: error.code,
        message: 'AI service is not configured.',
      });
    }

    if (error?.code === 'AI_INVALID_INPUT') {
      return sendAIError({
        res,
        statusCode: 400,
        code: error.code,
        message: 'Prompt is required.',
      });
    }

    if (error?.code === 'AI_INVALID_INSTRUCTIONS') {
      return sendAIError({
        res,
        statusCode: 500,
        code: error.code,
        message: 'AI configuration is invalid.',
      });
    }

    if (error?.code === 'AI_PROVIDER_ERROR') {
      return sendAIError({
        res,
        statusCode: 502,
        code: error.code,
        message: 'AI provider request failed.',
        provider: error.provider || 'unknown',
      });
    }

    return next(error);
  }
};

export const analyzeIssueWithAI = async (req, res, next) => {
  try {
    if (!isAIAvailable()) {
      return sendAIError({
        res,
        statusCode: 503,
        code: 'AI_NOT_CONFIGURED',
        message: 'AI service is not configured.',
      });
    }

    if (!req.task) {
      return sendAIError({
        res,
        statusCode: 500,
        code: 'AI_TASK_CONTEXT_NOT_LOADED',
        message: 'Task context was not loaded.',
      });
    }

    const result = await analyzeIssue(req.task);

    return sendAISuccess({
      res,
      taskId: req.task._id,
      operation: 'issue-analysis',
      result: result.analysis,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error('[AI] Issue analysis failed:', error);

    switch (error?.code) {
      case 'AI_NOT_CONFIGURED':
        return sendAIError({
          res,
          statusCode: 503,
          code: error.code,
          message: 'AI service is not configured.',
        });

      case 'AI_TASK_REQUIRED':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message: 'Task is required for AI analysis.',
        });

      case 'AI_TASK_TITLE_REQUIRED':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message: 'Task title is required for AI analysis.',
        });

      case 'AI_TASK_TITLE_TOO_LONG':
      case 'AI_TASK_DESCRIPTION_TOO_LONG':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message: error.message,
        });

      case 'AI_EMPTY_RESPONSE':
      case 'AI_INVALID_RESPONSE_FORMAT':
      case 'AI_INVALID_ANALYSIS':
      case 'AI_INCOMPLETE_ANALYSIS':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message: 'AI returned an invalid analysis response.',
        });

      case 'AI_PROVIDER_ERROR':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message: 'AI provider request failed.',
          provider: error.provider || 'unknown',
        });

      default:
        return next(error);
    }
  }
};

export const summarizeIssueWithAI = async (req, res, next) => {
  try {
    if (!isAIAvailable()) {
      return sendAIError({
        res,
        statusCode: 503,
        code: 'AI_NOT_CONFIGURED',
        message: 'AI service is not configured.',
      });
    }

    if (!req.task) {
      return sendAIError({
        res,
        statusCode: 500,
        code: 'AI_TASK_CONTEXT_NOT_LOADED',
        message: 'Task context was not loaded.',
      });
    }

    const result = await summarizeIssue(req.task);

    return sendAISuccess({
      res,
      taskId: req.task._id,
      operation: 'issue-summary',
      result: {
        summary: result.summary,
      },
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error('[AI] Issue summary failed:', error);

    switch (error?.code) {
      case 'AI_NOT_CONFIGURED':
        return sendAIError({
          res,
          statusCode: 503,
          code: error.code,
          message: 'AI service is not configured.',
        });

      case 'AI_TASK_REQUIRED':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message: 'Task is required for AI summary.',
        });

      case 'AI_TASK_TITLE_REQUIRED':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message: 'Task title is required for AI summary.',
        });

      case 'AI_TASK_TITLE_TOO_LONG':
      case 'AI_TASK_DESCRIPTION_TOO_LONG':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message: error.message,
        });

      case 'AI_EMPTY_SUMMARY':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message: 'AI returned an empty summary.',
        });

      case 'AI_PROVIDER_ERROR':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message: 'AI provider request failed.',
          provider: error.provider || 'unknown',
        });

      default:
        return next(error);
    }
  }
};

export const recommendPriorityWithAI = async (
  req,
  res,
  next,
) => {
  try {
    if (!isAIAvailable()) {
      return sendAIError({
        res,
        statusCode: 503,
        code: 'AI_NOT_CONFIGURED',
        message: 'AI service is not configured.',
      });
    }

    if (!req.task) {
      return sendAIError({
        res,
        statusCode: 500,
        code: 'AI_TASK_CONTEXT_NOT_LOADED',
        message: 'Task context was not loaded.',
      });
    }

    const result = await recommendPriority(req.task);

    return sendAISuccess({
      res,
      taskId: req.task._id,
      operation: 'priority-recommendation',
      result: {
        ...result.recommendation,
        currentPriority: req.task.priority || null,
      },
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error(
      '[AI] Priority recommendation failed:',
      error,
    );

    switch (error?.code) {
      case 'AI_NOT_CONFIGURED':
        return sendAIError({
          res,
          statusCode: 503,
          code: error.code,
          message: 'AI service is not configured.',
        });

      case 'AI_TASK_REQUIRED':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message:
            'Task is required for AI priority recommendation.',
        });

      case 'AI_TASK_TITLE_REQUIRED':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message:
            'Task title is required for AI priority recommendation.',
        });

      case 'AI_TASK_TITLE_TOO_LONG':
      case 'AI_TASK_DESCRIPTION_TOO_LONG':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message: error.message,
        });

      case 'AI_EMPTY_RESPONSE':
      case 'AI_INVALID_RESPONSE_FORMAT':
      case 'AI_INVALID_PRIORITY':
      case 'AI_UNSUPPORTED_PRIORITY':
      case 'AI_INCOMPLETE_PRIORITY':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message:
            'AI returned an invalid priority recommendation.',
        });

      case 'AI_PROVIDER_ERROR':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message: 'AI provider request failed.',
          provider: error.provider || 'unknown',
        });

      default:
        return next(error);
    }
  }
};

export const recommendLabelsWithAI = async (req, res, next) => {
  try {
    if (!isAIAvailable()) {
      return sendAIError({
        res,
        statusCode: 503,
        code: 'AI_NOT_CONFIGURED',
        message: 'AI service is not configured.',
      });
    }

    if (!req.task) {
      return sendAIError({
        res,
        statusCode: 500,
        code: 'AI_TASK_CONTEXT_NOT_LOADED',
        message: 'Task was not loaded.',
      });
    }

    const result = await recommendLabels(req.task);

    return sendAISuccess({
      res,
      taskId: req.task._id,
      operation: 'label-recommendation',
      result: {
        ...result.recommendation,
        currentLabels: req.task.labels || [],
      },
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error(
      '[AI] Label recommendation failed:',
      error,
    );

    switch (error?.code) {
      case 'AI_NOT_CONFIGURED':
        return sendAIError({
          res,
          statusCode: 503,
          code: error.code,
          message: 'AI service is not configured.',
        });

      case 'AI_TASK_REQUIRED':
      case 'AI_TASK_TITLE_REQUIRED':
      case 'AI_TASK_TITLE_TOO_LONG':
      case 'AI_TASK_DESCRIPTION_TOO_LONG':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message: error.message,
        });

      case 'AI_EMPTY_RESPONSE':
      case 'AI_INVALID_RESPONSE_FORMAT':
      case 'AI_INVALID_LABELS':
      case 'AI_INVALID_LABEL_COUNT':
      case 'AI_INVALID_LABEL_ENTRY':
      case 'AI_INCOMPLETE_LABEL':
      case 'AI_DUPLICATE_LABEL':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message: error.message,
        });

      case 'AI_PROVIDER_ERROR':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message: 'AI provider request failed.',
          provider: error.provider || 'unknown',
        });

      default:
        return next(error);
    }
  }
};

export const generateSubtasksWithAI = async (req, res, next) => {
  try {
    if (!isAIAvailable()) {
      return sendAIError({
        res,
        statusCode: 503,
        code: 'AI_NOT_CONFIGURED',
        message: 'AI service is not configured.',
      });
    }

    if (!req.task) {
      return sendAIError({
        res,
        statusCode: 500,
        code: 'AI_TASK_CONTEXT_NOT_LOADED',
        message: 'Task was not loaded.',
      });
    }

    const result = await generateSubtasks(req.task);

    return sendAISuccess({
      res,
      taskId: req.task._id,
      operation: 'subtask-generation',
      result: result.recommendation,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error(
      '[AI] Subtask generation failed:',
      error,
    );

    switch (error?.code) {
      case 'AI_NOT_CONFIGURED':
        return sendAIError({
          res,
          statusCode: 503,
          code: error.code,
          message: 'AI service is not configured.',
        });

      case 'AI_TASK_REQUIRED':
      case 'AI_TASK_TITLE_REQUIRED':
      case 'AI_TASK_TITLE_TOO_LONG':
      case 'AI_TASK_DESCRIPTION_TOO_LONG':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message: error.message,
        });

      case 'AI_EMPTY_RESPONSE':
      case 'AI_INVALID_RESPONSE_FORMAT':
      case 'AI_INVALID_SUBTASKS':
      case 'AI_INVALID_SUBTASK_COUNT':
      case 'AI_INVALID_SUBTASK_ENTRY':
      case 'AI_INCOMPLETE_SUBTASK':
      case 'AI_SUBTASK_TITLE_TOO_LONG':
      case 'AI_SUBTASK_DESCRIPTION_TOO_LONG':
      case 'AI_DUPLICATE_SUBTASK':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message: error.message,
        });

      case 'AI_PROVIDER_ERROR':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message: 'AI provider request failed.',
          provider: error.provider || 'unknown',
        });

      default:
        return next(error);
    }
  }
};

export const suggestSolutionsWithAI = async (req, res, next) => {
  try {
    if (!isAIAvailable()) {
      return sendAIError({
        res,
        statusCode: 503,
        code: 'AI_NOT_CONFIGURED',
        message: 'AI service is not configured.',
      });
    }

    if (!req.task) {
      return sendAIError({
        res,
        statusCode: 500,
        code: 'AI_TASK_CONTEXT_NOT_LOADED',
        message: 'Task was not loaded.',
      });
    }

    const result = await suggestSolutions(req.task);

    return sendAISuccess({
      res,
      taskId: req.task._id,
      operation: 'solution-suggestions',
      result: result.recommendation,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error(
      '[AI] Solution suggestions failed:',
      error,
    );

    switch (error?.code) {
      case 'AI_NOT_CONFIGURED':
        return sendAIError({
          res,
          statusCode: 503,
          code: error.code,
          message: 'AI service is not configured.',
        });

      case 'AI_TASK_REQUIRED':
      case 'AI_TASK_TITLE_REQUIRED':
      case 'AI_TASK_TITLE_TOO_LONG':
      case 'AI_TASK_DESCRIPTION_TOO_LONG':
        return sendAIError({
          res,
          statusCode: 400,
          code: error.code,
          message: error.message,
        });

      case 'AI_EMPTY_RESPONSE':
      case 'AI_INVALID_RESPONSE_FORMAT':
      case 'AI_INVALID_SUGGESTIONS':
      case 'AI_INVALID_SUGGESTION_COUNT':
      case 'AI_INVALID_SUGGESTION_ENTRY':
      case 'AI_INCOMPLETE_SUGGESTION':
      case 'AI_SUGGESTION_TITLE_TOO_LONG':
      case 'AI_SUGGESTION_DESCRIPTION_TOO_LONG':
      case 'AI_INVALID_SUGGESTION_STEPS':
      case 'AI_INVALID_STEP_COUNT':
      case 'AI_DUPLICATE_SUGGESTION':
      case 'AI_INCOMPLETE_STEP':
      case 'AI_STEP_TOO_LONG':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message: error.message,
        });

      case 'AI_PROVIDER_ERROR':
        return sendAIError({
          res,
          statusCode: 502,
          code: error.code,
          message: 'AI provider request failed.',
          provider: error.provider || 'unknown',
        });

      default:
        return next(error);
    }
  }
};