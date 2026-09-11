import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  listTaskAttachments,
  uploadTaskAttachment,
  downloadTaskAttachment,
  deleteTaskAttachment,
} from '../services/attachment.service';

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const formatFileSize = (bytes) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (date) =>
  new Date(date).toLocaleString();

const TaskAttachments = ({
  taskId,
}) => {
  const [attachments, setAttachments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const loadAttachments =
    useCallback(async () => {
      setLoading(true);
      setError('');

      try {
        const result =
          await listTaskAttachments(
            taskId,
          );

        setAttachments(
          result.data.attachments || [],
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'Failed to load attachments',
        );
      } finally {
        setLoading(false);
      }
    }, [taskId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const handleFileChange = (
    event,
  ) => {
    const file =
      event.target.files?.[0] ||
      null;

    setError('');
    setSuccess('');
    setProgress(0);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);

      setError(
        'File size must be 10 MB or less.',
      );

      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (
    event,
  ) => {
    event.preventDefault();

    if (
      !selectedFile ||
      uploading
    ) {
      return;
    }

    setError('');
    setSuccess('');
    setUploading(true);
    setProgress(0);

    try {
      await uploadTaskAttachment(
        taskId,
        selectedFile,
        (event) => {
          if (event.total) {
            setProgress(
              Math.round(
                (event.loaded /
                  event.total) *
                  100,
              ),
            );
          }
        },
      );

      setSelectedFile(null);
      setProgress(100);
      setSuccess(
        '✓ File uploaded successfully.',
      );

      event.target.reset();

      await loadAttachments();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to upload file',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (
    attachment,
  ) => {
    setError('');

    try {
      const response =
        await downloadTaskAttachment(
          taskId,
          attachment._id,
        );

      const blob =
        new Blob([
          response.data,
        ]);

      const url =
        window.URL.createObjectURL(
          blob,
        );

      const link =
        document.createElement('a');

      link.href = url;
      link.download =
        attachment.originalName;

      document.body.appendChild(
        link,
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url,
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to download file',
      );
    }
  };

  const handleDelete = async (
    attachment,
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${attachment.originalName}"?`,
      );

    if (!confirmed) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await deleteTaskAttachment(
        taskId,
        attachment._id,
      );

      setAttachments((current) =>
        current.filter(
          (item) =>
            item._id !==
            attachment._id,
        ),
      );

      setSuccess(
        '✓ Attachment deleted successfully.',
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to delete attachment',
      );
    }
  };

  return (
    <section className="task-attachments">
      <div className="task-attachments-header">
        <div>
          <h2>
            Attachments
          </h2>

          <p>
            Files related to this task
          </p>
        </div>

        <span className="task-attachments-count">
          {attachments.length}
        </span>
      </div>

      <form
        className="task-attachment-upload"
        onSubmit={handleUpload}
      >
        <label htmlFor="task-file">
          Select file
        </label>

        <input
          id="task-file"
          type="file"
          onChange={
            handleFileChange
          }
          disabled={uploading}
        />

        <div className="task-attachment-upload-row">
          <span>
            {selectedFile
              ? selectedFile.name
              : 'No file selected'}
          </span>

          <button
            type="submit"
            disabled={
              !selectedFile ||
              uploading
            }
          >
            {uploading
              ? `Uploading ${progress}%`
              : 'Upload File'}
          </button>
        </div>

        <small>
          Maximum file size: 10 MB
        </small>

        {uploading && (
          <div className="task-upload-progress">
            <div
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        )}
      </form>

      {success && (
        <p
          className="task-attachment-success"
          role="status"
        >
          {success}
        </p>
      )}

      {error && (
        <p
          className="task-attachment-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="task-attachments-empty">
          Loading attachments...
        </p>
      ) : attachments.length === 0 ? (
        <p className="task-attachments-empty">
          No files attached to this task yet.
        </p>
      ) : (
        <div className="task-attachment-list">
          {attachments.map(
            (attachment) => (
              <div
                className="task-attachment-item"
                key={
                  attachment._id
                }
              >
                <div className="task-attachment-icon">
                  📎
                </div>

                <div className="task-attachment-info">
                  <strong>
                    {attachment.originalName}
                  </strong>

                  <span>
                    {formatFileSize(
                      attachment.size,
                    )}
                    {' • '}
                    {formatDate(
                      attachment.createdAt,
                    )}
                    {' • '}
                    {attachment.uploadedBy?.name ||
                      'Unknown user'}
                  </span>
                </div>

                <div className="task-attachment-actions">
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        attachment,
                      )
                    }
                  >
                    Download
                  </button>

                  <button
                    type="button"
                    className="task-attachment-delete"
                    onClick={() =>
                      handleDelete(
                        attachment,
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
};

export default TaskAttachments;
