import {
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  useParams,
  Link,
} from 'react-router-dom';

import {
  getKanbanBoard,
  updateTaskStatus,
} from '../services/task.service';

import { useSocket } from '../context/SocketContext';

// ============================================================
// Kanban Board
// ============================================================

const KanbanBoard = () => {
  const {
    projectId,
  } = useParams();

  const {
    connected,
    joinProjectRoom,
    leaveProjectRoom,
    onTaskCreated,
    onTaskUpdated,
    onTaskAssigned,
    onTaskPriorityChanged,
    onTaskStatusChanged,
  } = useSocket();

  // ----------------------------------------------------------
  // Board state
  // ----------------------------------------------------------

  const [
    columns,
    setColumns,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    dragError,
    setDragError,
  ] = useState('');

  const [
    draggedTaskId,
    setDraggedTaskId,
  ] = useState(null);

  // ==========================================================
  // Load Kanban board
  // ==========================================================

  const loadBoard =
    useCallback(
      async () => {
        if (!projectId) {
          return;
        }

        setLoading(true);
        setError('');

        try {
          const result =
            await getKanbanBoard(
              projectId,
            );

          setColumns(
            result.data.columns,
          );
        } catch (err) {
          setError(
            err.response?.data
              ?.message ||
              'Failed to load board',
          );
        } finally {
          setLoading(false);
        }
      },
      [
        projectId,
      ],
    );

  // ==========================================================
  // Initial board load
  // ==========================================================

  useEffect(() => {
    loadBoard();
  }, [
    loadBoard,
  ]);

  // ==========================================================
  // Join project Socket.IO room
  // ==========================================================

  useEffect(() => {
    if (
      !projectId ||
      !connected
    ) {
      return;
    }

    console.log(
      `[Kanban Socket] Joining project: ${projectId}`,
    );

    joinProjectRoom(
      projectId,
    );

    return () => {
      console.log(
        `[Kanban Socket] Leaving project: ${projectId}`,
      );

      leaveProjectRoom(
        projectId,
      );
    };
  }, [
    projectId,
    connected,
    joinProjectRoom,
    leaveProjectRoom,
  ]);

  // ==========================================================
  // Helper: find task
  // ==========================================================

  const findTask =
    useCallback(
      (taskId) => {
        for (
          const column of columns
        ) {
          const task =
            column.tasks.find(
              (item) =>
                item._id ===
                taskId,
            );

          if (task) {
            return task;
          }
        }

        return null;
      },
      [
        columns,
      ],
    );

  // ==========================================================
  // Helper: remove task from all columns
  // ==========================================================

  const removeTaskFromColumns =
    useCallback(
      (
        previousColumns,
        taskId,
      ) => {
        return previousColumns.map(
          (column) => ({
            ...column,

            tasks:
              column.tasks.filter(
                (task) =>
                  task._id !==
                  taskId,
              ),
          }),
        );
      },
      [],
    );

  // ==========================================================
  // Helper: add task to correct column
  // ==========================================================

  const addTaskToColumn =
    useCallback(
      (
        previousColumns,
        task,
      ) => {
        return previousColumns.map(
          (column) => {
            if (
              column.status !==
              task.status
            ) {
              return column;
            }

            // ----------------------------------------------
            // Prevent duplicate task
            // ----------------------------------------------

            if (
              column.tasks.some(
                (existingTask) =>
                  existingTask._id ===
                  task._id,
              )
            ) {
              return column;
            }

            return {
              ...column,

              tasks: [
                task,
                ...column.tasks,
              ],
            };
          },
        );
      },
      [],
    );

  // ==========================================================
  // TASK CREATED
  //
  // Another user created a task in this project.
  // ==========================================================

  useEffect(() => {
    if (!connected) {
      return;
    }

    const unsubscribe =
      onTaskCreated(
        (payload) => {
          const newTask =
            payload?.task;

          if (!newTask) {
            return;
          }

          // --------------------------------------------------
          // Make sure this event belongs to this project.
          // --------------------------------------------------

          const eventProjectId =
            String(
              newTask.project?._id ||
                newTask.project,
            );

          if (
            eventProjectId !==
            String(projectId)
          ) {
            return;
          }

          console.log(
            '[Kanban Socket] task:created',
            newTask,
          );

          setColumns(
            (previousColumns) => {
              // --------------------------------------------
              // Prevent duplicate task.
              //
              // This can happen because the current browser
              // may receive the socket event for a task it
              // just created itself.
              // --------------------------------------------

              const alreadyExists =
                previousColumns.some(
                  (column) =>
                    column.tasks.some(
                      (task) =>
                        task._id ===
                        newTask._id,
                    ),
                );

              if (
                alreadyExists
              ) {
                return previousColumns;
              }

              return addTaskToColumn(
                previousColumns,
                newTask,
              );
            },
          );
        },
      );

    return unsubscribe;
  }, [
    connected,
    projectId,
    onTaskCreated,
    addTaskToColumn,
  ]);

  // ==========================================================
  // TASK UPDATED
  //
  // Handles changes such as:
  //
  // title
  // description
  // labels
  // dueDate
  // ==========================================================

  useEffect(() => {
    if (!connected) {
      return;
    }

    const unsubscribe =
      onTaskUpdated(
        (payload) => {
          const updatedTask =
            payload?.task;

          if (!updatedTask) {
            return;
          }

          const eventProjectId =
            String(
              updatedTask.project?._id ||
                updatedTask.project,
            );

          if (
            eventProjectId !==
            String(projectId)
          ) {
            return;
          }

          console.log(
            '[Kanban Socket] task:updated',
            updatedTask,
          );

          setColumns(
            (previousColumns) =>
              previousColumns.map(
                (column) => ({
                  ...column,

                  tasks:
                    column.tasks.map(
                      (task) =>
                        task._id ===
                        updatedTask._id
                          ? {
                              ...task,
                              ...updatedTask,
                            }
                          : task,
                    ),
                }),
              ),
          );
        },
      );

    return unsubscribe;
  }, [
    connected,
    projectId,
    onTaskUpdated,
  ]);

  // ==========================================================
  // TASK ASSIGNED
  //
  // Another user assigned/unassigned a task.
  // ==========================================================

  useEffect(() => {
    if (!connected) {
      return;
    }

    const unsubscribe =
      onTaskAssigned(
        (payload) => {
          const updatedTask =
            payload?.task;

          if (!updatedTask) {
            return;
          }

          const eventProjectId =
            String(
              updatedTask.project?._id ||
                updatedTask.project,
            );

          if (
            eventProjectId !==
            String(projectId)
          ) {
            return;
          }

          console.log(
            '[Kanban Socket] task:assigned',
            updatedTask,
          );

          setColumns(
            (previousColumns) =>
              previousColumns.map(
                (column) => ({
                  ...column,

                  tasks:
                    column.tasks.map(
                      (task) =>
                        task._id ===
                        updatedTask._id
                          ? {
                              ...task,
                              ...updatedTask,
                            }
                          : task,
                    ),
                }),
              ),
          );
        },
      );

    return unsubscribe;
  }, [
    connected,
    projectId,
    onTaskAssigned,
  ]);

  // ==========================================================
  // TASK PRIORITY CHANGED
  //
  // Another user changed task priority.
  // ==========================================================

  useEffect(() => {
    if (!connected) {
      return;
    }

    const unsubscribe =
      onTaskPriorityChanged(
        (payload) => {
          const updatedTask =
            payload?.task;

          if (!updatedTask) {
            return;
          }

          const eventProjectId =
            String(
              updatedTask.project?._id ||
                updatedTask.project,
            );

          if (
            eventProjectId !==
            String(projectId)
          ) {
            return;
          }

          console.log(
            '[Kanban Socket] task:priorityChanged',
            updatedTask,
          );

          setColumns(
            (previousColumns) =>
              previousColumns.map(
                (column) => ({
                  ...column,

                  tasks:
                    column.tasks.map(
                      (task) =>
                        task._id ===
                        updatedTask._id
                          ? {
                              ...task,
                              ...updatedTask,
                            }
                          : task,
                    ),
                }),
              ),
          );
        },
      );

    return unsubscribe;
  }, [
    connected,
    projectId,
    onTaskPriorityChanged,
  ]);

  // ==========================================================
  // TASK STATUS CHANGED
  //
  // This is the most important Kanban event.
  //
  // Example:
  //
  // User A:
  //
  // To Do → In Progress
  //
  // User B automatically sees:
  //
  // To Do
  //   task removed
  //
  // In Progress
  //   task added
  // ==========================================================

  useEffect(() => {
    if (!connected) {
      return;
    }

    const unsubscribe =
      onTaskStatusChanged(
        (payload) => {
          const updatedTask =
            payload?.task;

          if (!updatedTask) {
            return;
          }

          const eventProjectId =
            String(
              updatedTask.project?._id ||
                updatedTask.project,
            );

          if (
            eventProjectId !==
            String(projectId)
          ) {
            return;
          }

          console.log(
            '[Kanban Socket] task:statusChanged',
            updatedTask,
          );

          setColumns(
            (previousColumns) => {
              // --------------------------------------------
              // Remove task from every column.
              // --------------------------------------------

              const withoutTask =
                removeTaskFromColumns(
                  previousColumns,
                  updatedTask._id,
                );

              // --------------------------------------------
              // Add task to its new status column.
              // --------------------------------------------

              return addTaskToColumn(
                withoutTask,
                updatedTask,
              );
            },
          );
        },
      );

    return unsubscribe;
  }, [
    connected,
    projectId,
    onTaskStatusChanged,
    removeTaskFromColumns,
    addTaskToColumn,
  ]);

  // ==========================================================
  // Drag Start
  // ==========================================================

  const handleDragStart =
    (taskId) => {
      setDragError('');
      setDraggedTaskId(
        taskId,
      );
    };

  // ==========================================================
  // Drag Over
  // ==========================================================

  const handleDragOver =
    (event) => {
      // ------------------------------------------------------
      // Required for onDrop to fire.
      // ------------------------------------------------------

      event.preventDefault();
    };

  // ==========================================================
  // Drop
  // ==========================================================

  const handleDrop =
    async (
      targetStatus,
    ) => {
      if (
        !draggedTaskId
      ) {
        return;
      }

      // ------------------------------------------------------
      // Find dragged task from current board.
      // ------------------------------------------------------

      const draggedTask =
        findTask(
          draggedTaskId,
        );

      if (!draggedTask) {
        setDraggedTaskId(
          null,
        );

        return;
      }

      // ------------------------------------------------------
      // Prevent dropping into the same column.
      // ------------------------------------------------------

      if (
        draggedTask.status ===
        targetStatus
      ) {
        setDraggedTaskId(
          null,
        );

        return;
      }

      // ------------------------------------------------------
      // Keep previous state for rollback.
      // ------------------------------------------------------

      const previousColumns =
        columns;

      // ------------------------------------------------------
      // Optimistic update
      //
      // Move card immediately before server response.
      // ------------------------------------------------------

      setColumns(
        (prevColumns) =>
          prevColumns.map(
            (column) => {
              // --------------------------------------------
              // Remove task from old column.
              // --------------------------------------------

              if (
                column.status !==
                targetStatus
              ) {
                return {
                  ...column,

                  tasks:
                    column.tasks.filter(
                      (task) =>
                        task._id !==
                        draggedTaskId,
                    ),
                };
              }

              // --------------------------------------------
              // Add task to target column.
              // --------------------------------------------

              const movedTask = {
                ...draggedTask,

                status:
                  targetStatus,
              };

              return {
                ...column,

                tasks: [
                  ...column.tasks.filter(
                    (task) =>
                      task._id !==
                      draggedTaskId,
                  ),
                  movedTask,
                ],
              };
            },
          ),
      );

      try {
        // ----------------------------------------------------
        // Persist change on server.
        //
        // Server will then emit:
        //
        // task:statusChanged
        // ----------------------------------------------------

        await updateTaskStatus(
          draggedTaskId,
          targetStatus,
        );
      } catch (err) {
        // ----------------------------------------------------
        // Roll back optimistic update.
        // ----------------------------------------------------

        setDragError(
          err.response?.data
            ?.message ||
            'Failed to move task',
        );

        setColumns(
          previousColumns,
        );
      } finally {
        setDraggedTaskId(
          null,
        );
      }
    };

  // ==========================================================
  // Loading
  // ==========================================================

  if (loading) {
    return (
      <p>
        Loading board...
      </p>
    );
  }

  // ==========================================================
  // Error
  // ==========================================================

  if (error) {
    return (
      <p role="alert">
        {error}
      </p>
    );
  }

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <div className="page page-kanban">
      <div className="page-hero">
        <div>
          <span className="eyebrow">
            Project workflow
          </span>

          <h1>
            Kanban Board
          </h1>

          <p className="page-subtitle">
            Drag tasks through the development workflow.
          </p>

          {/* ------------------------------------------------
              Socket connection indicator
          ------------------------------------------------- */}

          <small
            aria-live="polite"
          >
            {connected
              ? '● Real-time connected'
              : '○ Real-time disconnected'}
          </small>
        </div>
      </div>

      {/* ----------------------------------------------------
          Drag error
      ----------------------------------------------------- */}

      {dragError && (
        <p role="alert">
          {dragError}
        </p>
      )}

      {/* ----------------------------------------------------
          Kanban board
      ----------------------------------------------------- */}

      <div className="kanban-board">
        {columns.map(
          (column) => (
            <div
              key={
                column.status
              }
              className={`kanban-column kanban-${column.status}`}
              onDragOver={
                handleDragOver
              }
              onDrop={() =>
                handleDrop(
                  column.status,
                )
              }
            >
              <h2>
                {
                  column.label
                }{' '}
                (
                {
                  column.tasks
                    .length
                }
                )
              </h2>

              {column.tasks.map(
                (task) => (
                  <div
                    key={
                      task._id
                    }
                    className="kanban-card"
                    draggable
                    onDragStart={() =>
                      handleDragStart(
                        task._id,
                      )
                    }
                  >
                    <Link
                      to={`/tasks/${task._id}`}
                    >
                      {
                        task.title
                      }
                    </Link>

                    <div>
                      <small>
                        Priority:{' '}
                        {
                          task.priority
                        }
                      </small>
                    </div>

                    {task.assignee && (
                      <div>
                        <small>
                          Assignee:{' '}
                          {
                            task
                              .assignee
                              .name
                          }
                        </small>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
};

export default KanbanBoard;