import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getKanbanBoard, updateTaskStatus } from '../services/task.service';

// --------------------------------------------------------------
// Native HTML5 drag-and-drop rather than a library. The client
// has no drag-and-drop dependency installed (see package.json),
// and the browser's built-in draggable/onDragStart/onDrop events
// are enough for a single-list-to-single-list board like this —
// pulling in a library would be adding a dependency for something
// four event handlers already do.
// --------------------------------------------------------------
const KanbanBoard = () => {
  const { projectId } = useParams();

  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragError, setDragError] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getKanbanBoard(projectId);
      setColumns(result.data.columns);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handleDragStart = (taskId) => {
    setDragError('');
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e) => {
    // Required for onDrop to fire at all — the browser's default
    // is to reject drops everywhere.
    e.preventDefault();
  };

  const handleDrop = async (targetStatus) => {
    if (!draggedTaskId) return;

    // Optimistic update: move the card immediately, then correct
    // it if the server rejects the move (e.g. a Developer dragging
    // a task that isn't theirs — see requireStatusUpdatePermission
    // on the backend).
    const previousColumns = columns;

    setColumns((prevColumns) =>
      prevColumns.map((column) => {
        if (column.status === targetStatus) {
          const movedTask = previousColumns
            .flatMap((c) => c.tasks)
            .find((t) => t._id === draggedTaskId);
          if (!movedTask || column.tasks.some((t) => t._id === draggedTaskId)) {
            return column;
          }
          return { ...column, tasks: [...column.tasks, { ...movedTask, status: targetStatus }] };
        }
        return { ...column, tasks: column.tasks.filter((t) => t._id !== draggedTaskId) };
      }),
    );

    try {
      await updateTaskStatus(draggedTaskId, targetStatus);
    } catch (err) {
      setDragError(err.response?.data?.message || 'Failed to move task');
      // Roll back to the last known-good state from the server
      // rather than trusting the optimistic guess.
      setColumns(previousColumns);
    } finally {
      setDraggedTaskId(null);
    }
  };

  if (loading) return <p>Loading board...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <div>
      <h1>Kanban Board</h1>
      <p>
        <Link to={`/projects/${projectId}`}>Back to project</Link>
        {' · '}
        <Link to={`/projects/${projectId}/tasks`}>List view</Link>
      </p>

      {dragError && <p role="alert">{dragError}</p>}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {columns.map((column) => (
          <div
            key={column.status}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.status)}
            style={{ minWidth: '220px', border: '1px solid #ccc', padding: '0.5rem' }}
          >
            <h2>
              {column.label} ({column.tasks.length})
            </h2>

            {column.tasks.map((task) => (
              <div
                key={task._id}
                draggable
                onDragStart={() => handleDragStart(task._id)}
                style={{
                  border: '1px solid #999',
                  padding: '0.5rem',
                  marginBottom: '0.5rem',
                  cursor: 'grab',
                }}
              >
                <Link to={`/tasks/${task._id}`}>{task.title}</Link>
                <div>
                  <small>Priority: {task.priority}</small>
                </div>
                {task.assignee && (
                  <div>
                    <small>Assignee: {task.assignee.name}</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;