import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import RequireRole from '../components/RequireRole';
import ActivityFeed from '../components/ActivityFeed';
import {
  getProject,
  updateProject,
  archiveProject,
  unarchiveProject,
  getProjectDashboard,
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
} from '../services/project.service';
import { listMembers as listOrgMembers } from '../services/organization.service';
import { useOrganization } from '../context/OrganizationContext';

const ProjectDetail = () => {
  const { projectId } = useParams();
  const { currentOrganizationId } = useOrganization();

  const [project, setProject] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [members, setMembers] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const [archiveError, setArchiveError] = useState('');
  const [archiving, setArchiving] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [memberActionErrors, setMemberActionErrors] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const [projectResult, dashboardResult, membersResult] =
        await Promise.all([
          getProject(projectId),
          getProjectDashboard(projectId),
          listProjectMembers(projectId),
        ]);

      const loadedProject = projectResult.data.project;

      setProject(loadedProject);
      setSettingsForm({
        name: loadedProject.name,
        description: loadedProject.description || '',
      });
      setDashboard(dashboardResult.data);
      setMembers(membersResult.data.members);

      if (currentOrganizationId) {
        const orgMembersResult =
          await listOrgMembers(currentOrganizationId);

        setOrgMembers(orgMembersResult.data.members);
      }
    } catch (err) {
      setPageError(
        err.response?.data?.message ||
          'Failed to load project',
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, currentOrganizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSettingsChange = (e) => {
    setSettingsForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSavingSettings(true);

    try {
      const result = await updateProject(
        projectId,
        settingsForm,
      );
      setProject(result.data.project);
    } catch (err) {
      setSettingsError(
        err.response?.data?.message ||
          'Failed to update project',
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleArchiveToggle = async () => {
    setArchiveError('');
    setArchiving(true);

    try {
      const result =
        project.status === 'archived'
          ? await unarchiveProject(projectId)
          : await archiveProject(projectId);

      setProject(result.data.project);
    } catch (err) {
      setArchiveError(
        err.response?.data?.message ||
          'Failed to change archive status',
      );
    } finally {
      setArchiving(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setAddMemberError('');

    if (!selectedUserId) {
      setAddMemberError('Choose a member to add');
      return;
    }

    setAddingMember(true);

    try {
      await addProjectMember(projectId, selectedUserId);
      setSelectedUserId('');
      await loadData();
    } catch (err) {
      setAddMemberError(
        err.response?.data?.message ||
          'Failed to add member',
      );
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setMemberActionErrors((prev) => ({
      ...prev,
      [memberId]: '',
    }));

    try {
      await removeProjectMember(projectId, memberId);
      await loadData();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to remove member';

      setMemberActionErrors((prev) => ({
        ...prev,
        [memberId]: message,
      }));
    }
  };

  if (loading) {
    return (
      <div className="page-state-card">
        <div className="activity-spinner" />
        <p>Loading project...</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="page-state-card page-state-error">
        <strong>Unable to load project</strong>
        <p>{pageError}</p>
        <button
          type="button"
          className="button button-primary"
          onClick={loadData}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!project) return null;

  const existingMemberUserIds = new Set(
    members.map((member) => member.user._id),
  );

  const addableOrgMembers = orgMembers.filter(
    (member) =>
      !existingMemberUserIds.has(member.user._id),
  );

  const taskStats = dashboard?.taskStats || {};
  const completion =
    dashboard?.progress?.completionPercentage || 0;

  const initials = (name = '') =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U';

  return (
    <div className="page page-project-detail">
      {/* ======================================================
          PROJECT HEADER
          ====================================================== */}
      <header className="project-detail-header">
        <div>
          <span className="eyebrow">Project workspace</span>

          <div className="project-title-row">
            <h1>{project.name}</h1>

            <span
              className={`status-badge ${
                project.status === 'archived'
                  ? 'status-archived'
                  : 'status-active'
              }`}
            >
              {project.status === 'archived'
                ? 'Archived'
                : 'Active'}
            </span>
          </div>

          <p className="page-subtitle">
            {project.description ||
              'Project workspace and delivery overview.'}
          </p>
        </div>
      </header>

      {/* ======================================================
          MAIN PROJECT DASHBOARD
          ====================================================== */}
      <div className="project-overview-grid">
        <main className="project-overview-main">
          {/* Overview */}
          <section className="project-dashboard-card project-overview-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Overview</span>
                <h2>Project Dashboard</h2>
              </div>
            </div>

            <div className="project-stat-cards">
              <div className="project-stat-card">
                <span>Team members</span>
                <strong>
                  {dashboard?.teamSize ?? members.length}
                </strong>
              </div>

              <div className="project-stat-card">
                <span>Total tasks</span>
                <strong>{taskStats.total ?? 0}</strong>
              </div>

              <div className="project-stat-card">
                <span>In progress</span>
                <strong>{taskStats.inProgress ?? 0}</strong>
              </div>

              <div className="project-stat-card">
                <span>Completed</span>
                <strong>{taskStats.completed ?? 0}</strong>
              </div>
            </div>

            <div className="project-progress-row">
              <div className="project-progress-label">
                <span>Project completion</span>
                <strong>{completion}%</strong>
              </div>

              <div className="project-progress-track">
                <div
                  className="project-progress-value"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </section>

          {/* Settings */}
          <RequireRole allowedRoles={['owner', 'admin']}>
            <section className="form-card project-settings-card">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Configuration</span>
                  <h2>Project Settings</h2>
                </div>
              </div>

              <form onSubmit={handleSettingsSave}>
                <div className="form-field">
                  <label htmlFor="settings-name">
                    Project name
                  </label>
                  <input
                    id="settings-name"
                    name="name"
                    type="text"
                    value={settingsForm.name}
                    onChange={handleSettingsChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="settings-description">
                    Description
                  </label>
                  <textarea
                    id="settings-description"
                    name="description"
                    value={settingsForm.description}
                    onChange={handleSettingsChange}
                    rows={4}
                  />
                </div>

                {settingsError && (
                  <p className="form-error" role="alert">
                    {settingsError}
                  </p>
                )}

                <div className="settings-actions">
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={savingSettings}
                  >
                    {savingSettings
                      ? 'Saving...'
                      : 'Save Changes'}
                  </button>

                  <button
                    type="button"
                    className="button button-danger-outline"
                    onClick={handleArchiveToggle}
                    disabled={archiving}
                  >
                    {archiving
                      ? 'Updating...'
                      : project.status === 'archived'
                        ? 'Unarchive Project'
                        : 'Archive Project'}
                  </button>
                </div>

                {archiveError && (
                  <p className="form-error" role="alert">
                    {archiveError}
                  </p>
                )}
              </form>
            </section>
          </RequireRole>

          {/* Members */}
          <section className="members-card project-members-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Team</span>
                <h2>Project Members</h2>
              </div>

              <span className="count-badge">
                {members.length}
              </span>
            </div>

            <ul className="member-list">
              {members.map((member) => (
                <li
                  key={member._id}
                  className="member-row"
                >
                  <div className="member-identity">
                    <span className="member-avatar">
                      {initials(member.user.name)}
                    </span>

                    <div>
                      <strong>{member.user.name}</strong>
                      <span>{member.user.email}</span>
                    </div>
                  </div>

                  <div className="member-row-actions">
                    <span className="member-role-badge">
                      {member.role || 'MEMBER'}
                    </span>

                    <RequireRole
                      allowedRoles={[
                        'owner',
                        'admin',
                        'manager',
                      ]}
                    >
                      <button
                        type="button"
                        className="button button-danger-outline button-small"
                        onClick={() =>
                          handleRemoveMember(member._id)
                        }
                      >
                        Remove
                      </button>
                    </RequireRole>
                  </div>

                  {memberActionErrors[member._id] && (
                    <p
                      className="form-error member-error"
                      role="alert"
                    >
                      {memberActionErrors[member._id]}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <RequireRole
              allowedRoles={[
                'owner',
                'admin',
                'manager',
              ]}
            >
              <div className="add-member-area">
                <h3>Add a member</h3>

                {addableOrgMembers.length === 0 ? (
                  <p className="muted-text">
                    Every organization member is already on
                    this project.
                  </p>
                ) : (
                  <form
                    className="add-member-form"
                    onSubmit={handleAddMember}
                  >
                    <select
                      value={selectedUserId}
                      onChange={(e) =>
                        setSelectedUserId(e.target.value)
                      }
                    >
                      <option value="">
                        Choose a member...
                      </option>

                      {addableOrgMembers.map((member) => (
                        <option
                          key={member.user._id}
                          value={member.user._id}
                        >
                          {member.user.name} (
                          {member.role})
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={addingMember}
                    >
                      {addingMember
                        ? 'Adding...'
                        : 'Add to Project'}
                    </button>
                  </form>
                )}

                {addMemberError && (
                  <p className="form-error" role="alert">
                    {addMemberError}
                  </p>
                )}
              </div>
            </RequireRole>
          </section>
        </main>

        {/* ====================================================
            RIGHT SIDEBAR
            ==================================================== */}
        <aside className="project-overview-sidebar">
          {/* Task statistics */}
          <section className="dashboard-side-card">
            <div className="side-card-heading">
              <span className="side-card-icon">◔</span>
              <h2>Task Statistics</h2>
            </div>

            <div className="task-stat-visual">
              <div
                className="task-donut"
                style={{
                  '--completion-angle': `${completion * 3.6}deg`,
                }}
              >
                <div className="task-donut-inner">
                  <strong>{completion}%</strong>
                  <span>Complete</span>
                </div>
              </div>

              <div className="task-stat-list">
                <div>
                  <span>
                    <i className="stat-dot todo" />
                    To Do
                  </span>
                  <strong>{taskStats.pending ?? 0}</strong>
                </div>

                <div>
                  <span>
                    <i className="stat-dot progress" />
                    In Progress
                  </span>
                  <strong>
                    {taskStats.inProgress ?? 0}
                  </strong>
                </div>

                <div>
                  <span>
                    <i className="stat-dot review" />
                    In Review
                  </span>
                  <strong>
                    {taskStats.inReview ?? 0}
                  </strong>
                </div>

                <div>
                  <span>
                    <i className="stat-dot done" />
                    Done
                  </span>
                  <strong>{taskStats.completed ?? 0}</strong>
                </div>

                <div className="task-stat-total">
                  <span>Total</span>
                  <strong>{taskStats.total ?? 0}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <section className="dashboard-side-card">
            <div className="side-card-heading">
              <span className="side-card-icon">↯</span>
              <h2>Quick Actions</h2>
            </div>

            <div className="quick-action-list">
              <Link
                className="quick-action-button quick-action-blue"
                to={`/projects/${projectId}/tasks`}
              >
                <span className="quick-action-icon">☑</span>
                <span>View Task List</span>
                <span>→</span>
              </Link>

              <Link
                className="quick-action-button quick-action-purple"
                to={`/projects/${projectId}/kanban`}
              >
                <span className="quick-action-icon">▥</span>
                <span>Open Kanban Board</span>
                <span>→</span>
              </Link>
            </div>
          </section>

          {/* Project information */}
          <section className="dashboard-side-card">
            <div className="side-card-heading">
              <span className="side-card-icon">ⓘ</span>
              <h2>Project Info</h2>
            </div>

            <div className="project-info-list">
              <div>
                <span>Status</span>
                <strong
                  className={
                    project.status === 'archived'
                      ? 'info-status archived'
                      : 'info-status'
                  }
                >
                  {project.status === 'archived'
                    ? 'Archived'
                    : 'Active'}
                </strong>
              </div>

              <div>
                <span>Created</span>
                <strong>
                  {project.createdAt
                    ? new Date(
                        project.createdAt,
                      ).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        },
                      )
                    : '—'}
                </strong>
              </div>

              <div>
                <span>Last Updated</span>
                <strong>
                  {project.updatedAt
                    ? new Date(
                        project.updatedAt,
                      ).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        },
                      )
                    : '—'}
                </strong>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* Activity remains full-width beneath the dashboard */}
      <ActivityFeed
        projectId={projectId}
        limit={20}
      />
    </div>
  );
};

export default ProjectDetail;
