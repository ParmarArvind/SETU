import { useState } from 'react';

import {
  analyzeIssueWithAI,
  summarizeIssueWithAI,
  recommendPriorityWithAI,
  recommendLabelsWithAI,
  generateSubtasksWithAI,
  suggestSolutionsWithAI,
} from '../../services/ai.service';

import {
  updateTaskPriority,
  updateTask,
  createTask,
} from '../../services/task.service';

const AI_OPERATIONS = [
  {
    value: 'analysis',
    label: 'Analyze Issue',
    request: analyzeIssueWithAI,
  },
  {
    value: 'summary',
    label: 'Generate Summary',
    request: summarizeIssueWithAI,
  },
  {
    value: 'priority',
    label: 'Recommend Priority',
    request: recommendPriorityWithAI,
  },
  {
    value: 'labels',
    label: 'Recommend Labels',
    request: recommendLabelsWithAI,
  },
  {
    value: 'subtasks',
    label: 'Generate Subtasks',
    request: generateSubtasksWithAI,
  },
  {
    value: 'solutions',
    label: 'Suggest Solutions',
    request: suggestSolutionsWithAI,
  },
];

const formatLabel = (value) => {
  if (!value) {
    return '';
  }

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
};

const renderValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return <p>{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>
            {typeof item === 'object'
              ? renderValue(item)
              : String(item)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className="ai-result-object">
        {Object.entries(value).map(
          ([key, nestedValue]) => (
            <div
              className="ai-result-field"
              key={key}
            >
              <strong>
                {formatLabel(key)}
              </strong>

              {renderValue(nestedValue)}
            </div>
          ),
        )}
      </div>
    );
  }

  return null;
};

const getRecommendedLabels = (labels) => {
  if (!Array.isArray(labels)) {
    return [];
  }

  return labels
    .map((label) => {
      if (typeof label === 'string') {
        return label.trim();
      }

      if (
        label &&
        typeof label.name === 'string'
      ) {
        return label.name.trim();
      }

      return '';
    })
    .filter(Boolean);
};

const getSubtaskKey = (subtask) => {
  if (!subtask?.title) {
    return '';
  }

  return subtask.title
    .trim()
    .toLowerCase();
};

const AIAssistantPanel = ({
  taskId,
  projectId,
  currentLabels = [],
  onTaskUpdated,
}) => {
  const [selectedOperation, setSelectedOperation] =
    useState('analysis');

  const [result, setResult] = useState(null);

  const [loading, setLoading] =
    useState(false);

  const [applyAction, setApplyAction] =
    useState('');

  const [error, setError] =
    useState('');

  const [applyError, setApplyError] =
    useState('');

  const [applySuccess, setApplySuccess] =
    useState('');

  const [providerInfo, setProviderInfo] =
    useState(null);

  const [createdSubtaskKeys, setCreatedSubtaskKeys] =
    useState([]);

  const handleGenerate = async () => {
    if (!taskId || loading || applyAction) {
      return;
    }

    const selectedAI =
      AI_OPERATIONS.find(
        (operation) =>
          operation.value === selectedOperation,
      );

    if (!selectedAI) {
      return;
    }

    setLoading(true);
    setError('');
    setApplyError('');
    setApplySuccess('');
    setResult(null);
    setProviderInfo(null);

    try {
      const response =
        await selectedAI.request(taskId);

      const responseData =
        response?.data;

      setResult(
        responseData?.result ||
          responseData?.analysis ||
          responseData?.recommendation ||
          null,
      );

      setProviderInfo({
        provider: responseData?.provider,
        model: responseData?.model,
        operation: responseData?.operation,
      });
    } catch (err) {
      const apiError =
        err.response?.data?.error;

      const legacyMessage =
        err.response?.data?.message;

      setError(
        apiError?.message ||
          legacyMessage ||
          'Failed to generate AI response.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPriority = async () => {
    const recommendedPriority =
      result?.priority;

    if (
      !taskId ||
      !recommendedPriority ||
      loading ||
      applyAction
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Apply "${recommendedPriority}" as the task priority?`,
    );

    if (!confirmed) {
      return;
    }

    setApplyAction('priority');
    setApplyError('');
    setApplySuccess('');

    try {
      const response =
        await updateTaskPriority(
          taskId,
          recommendedPriority,
        );

      const updatedTask =
        response?.data?.task;

      if (updatedTask) {
        onTaskUpdated?.(updatedTask);
      }

      setApplySuccess(
        'AI-recommended priority applied successfully.',
      );
    } catch (err) {
      const apiError =
        err.response?.data?.error;

      const legacyMessage =
        err.response?.data?.message;

      setApplyError(
        apiError?.message ||
          legacyMessage ||
          'Failed to apply recommended priority.',
      );
    } finally {
      setApplyAction('');
    }
  };

  const handleApplyLabels = async () => {
    const recommendedLabels =
      getRecommendedLabels(result?.labels);

    if (
      !taskId ||
      recommendedLabels.length === 0 ||
      loading ||
      applyAction
    ) {
      return;
    }

    const existingLabels = Array.isArray(
      currentLabels,
    )
      ? currentLabels
      : [];

    const mergedLabels = [
      ...new Set([
        ...existingLabels,
        ...recommendedLabels,
      ]),
    ];

    const newLabels = recommendedLabels.filter(
      (label) => !existingLabels.includes(label),
    );

    if (newLabels.length === 0) {
      setApplySuccess(
        'All recommended labels are already applied.',
      );
      return;
    }

    const confirmed = window.confirm(
      `Apply these labels?\n\n${newLabels.join(', ')}`,
    );

    if (!confirmed) {
      return;
    }

    setApplyAction('labels');
    setApplyError('');
    setApplySuccess('');

    try {
      const response =
        await updateTask(taskId, {
          labels: mergedLabels,
        });

      const updatedTask =
        response?.data?.task;

      if (updatedTask) {
        onTaskUpdated?.(updatedTask);
      }

      setApplySuccess(
        'AI-recommended labels applied successfully.',
      );
    } catch (err) {
      const apiError =
        err.response?.data?.error;

      const legacyMessage =
        err.response?.data?.message;

      setApplyError(
        apiError?.message ||
          legacyMessage ||
          'Failed to apply recommended labels.',
      );
    } finally {
      setApplyAction('');
    }
  };

  const handleCreateSubtasks = async () => {
    const generatedSubtasks =
      Array.isArray(result?.subtasks)
        ? result.subtasks
        : [];

    const remainingSubtasks =
      generatedSubtasks.filter((subtask) => {
        const key = getSubtaskKey(subtask);

        return (
          key &&
          !createdSubtaskKeys.includes(key)
        );
      });

    if (
      !projectId ||
      remainingSubtasks.length === 0 ||
      loading ||
      applyAction
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Create ${remainingSubtasks.length} generated subtask${
        remainingSubtasks.length === 1 ? '' : 's'
      } in this project?`,
    );

    if (!confirmed) {
      return;
    }

    setApplyAction('subtasks');
    setApplyError('');
    setApplySuccess('');

    try {
      const successfullyCreatedKeys = [];
      let createdCount = 0;

      for (const subtask of remainingSubtasks) {
        if (
          !subtask ||
          typeof subtask.title !== 'string' ||
          !subtask.title.trim()
        ) {
          continue;
        }

        await createTask(projectId, {
          title: subtask.title.trim(),
          description:
            typeof subtask.description === 'string'
              ? subtask.description.trim()
              : '',
          priority: 'medium',
          status: 'todo',
          labels: [],
        });

        successfullyCreatedKeys.push(
          getSubtaskKey(subtask),
        );

        createdCount += 1;
      }

      setCreatedSubtaskKeys((previousKeys) => [
        ...new Set([
          ...previousKeys,
          ...successfullyCreatedKeys,
        ]),
      ]);

      setApplySuccess(
        `${createdCount} AI-generated subtask${
          createdCount === 1 ? '' : 's'
        } created successfully.`,
      );
    } catch (err) {
      const apiError =
        err.response?.data?.error;

      const legacyMessage =
        err.response?.data?.message;

      setApplyError(
        apiError?.message ||
          legacyMessage ||
          'Failed to create generated subtasks.',
      );
    } finally {
      setApplyAction('');
    }
  };

  const resetResults = () => {
    setResult(null);
    setError('');
    setApplyError('');
    setApplySuccess('');
    setProviderInfo(null);
  };

  const canApplyPriority =
    selectedOperation === 'priority' &&
    typeof result?.priority === 'string';

  const canApplyLabels =
    selectedOperation === 'labels' &&
    getRecommendedLabels(result?.labels).length > 0;

  const canCreateSubtasks =
    selectedOperation === 'subtasks' &&
    Array.isArray(result?.subtasks) &&
    result.subtasks.some(
      (subtask) =>
        getSubtaskKey(subtask) &&
        !createdSubtaskKeys.includes(
          getSubtaskKey(subtask),
        ),
    );

  return (
    <section className="ai-assistant-panel">
      <h2>SETU AI Assistant</h2>

      <p>
        Generate AI recommendations for this task.
        Recommendations are not applied automatically.
      </p>

      <div>
        <label htmlFor="ai-operation">
          Choose AI operation
        </label>

        <select
          id="ai-operation"
          value={selectedOperation}
          onChange={(event) => {
            setSelectedOperation(
              event.target.value,
            );

            resetResults();
          }}
          disabled={loading || Boolean(applyAction)}
        >
          {AI_OPERATIONS.map((operation) => (
            <option
              key={operation.value}
              value={operation.value}
            >
              {operation.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={
          loading ||
          Boolean(applyAction) ||
          !taskId
        }
      >
        {loading
          ? 'Generating...'
          : 'Generate AI Recommendation'}
      </button>

      {error && (
        <p
          role="alert"
          className="ai-error"
        >
          {error}
        </p>
      )}

      {applyError && (
        <p
          role="alert"
          className="ai-error"
        >
          {applyError}
        </p>
      )}

      {applySuccess && (
        <p className="ai-success">
          {applySuccess}
        </p>
      )}

      {providerInfo && (
        <p className="ai-provider-info">
          Provider:{' '}
          {providerInfo.provider || 'Unknown'}
          {' | '}
          Model:{' '}
          {providerInfo.model || 'Unknown'}
        </p>
      )}

      {result && (
        <div className="ai-result">
          <h3>AI Result</h3>

          {renderValue(result)}

          {canApplyPriority && (
            <button
              type="button"
              onClick={handleApplyPriority}
              disabled={
                loading ||
                Boolean(applyAction)
              }
            >
              {applyAction === 'priority'
                ? 'Applying...'
                : 'Apply Recommended Priority'}
            </button>
          )}

          {canApplyLabels && (
            <button
              type="button"
              onClick={handleApplyLabels}
              disabled={
                loading ||
                Boolean(applyAction)
              }
            >
              {applyAction === 'labels'
                ? 'Applying...'
                : 'Apply Recommended Labels'}
            </button>
          )}

          {canCreateSubtasks && (
            <button
              type="button"
              onClick={handleCreateSubtasks}
              disabled={
                loading ||
                Boolean(applyAction)
              }
            >
              {applyAction === 'subtasks'
                ? 'Creating...'
                : 'Create Remaining Subtasks'}
            </button>
          )}

          {selectedOperation === 'subtasks' &&
            !canCreateSubtasks && (
              <p>
                All generated subtasks from this
                recommendation have already been created
                during this session.
              </p>
            )}
        </div>
      )}
    </section>
  );
};

export default AIAssistantPanel;