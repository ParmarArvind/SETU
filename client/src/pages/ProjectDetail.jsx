import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import RequireRole from '../components/RequireRole';
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

  const [settingsForm, setSettingsForm] = useState({ name: '', description: '' });
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
      const [projectResult, dashboardResult, membersResult] = await Promise.all([
        getProject(projectId),
        getProjectDashboard(projectId),
        listProjectMembers(projectId),
      ]);

      setProject(projectResult.data.project);
      setSettingsForm({
        name: projectResult.data.project.name,
        description: projectResult.data.project.description || '',
      });
      setDashboard(dashboardResult.data);
      setMembers(membersResult.data.members);

      if (currentOrganizationId) {
        const orgMembersResult = await listOrgMembers(currentOrganizationId);
        setOrgMembers(orgMembersResult.data.members);
      }
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId, currentOrganizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSettingsChange = (e) => {
    setSettingsForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSavingSettings(true);

    try {
      const result = await updateProject(projectId, settingsForm);
      setProject(result.data.project);
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Failed to update project');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleArchiveToggle = async () => {
    setArchiveError('');
    setArchiving(true);

    try {
      if (project.status === 'archived') {
        const result = await unarchiveProject(projectId);
        setProject(result.data.project);
      } else {
        const result = await archiveProject(projectId);
        setProject(result.data.project);
      }
    } catch (err) {
      setArchiveError(err.response?.data?.message || 'Failed to change archive status');
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
      setAddMemberError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setMemberActionErrors((prev) => ({ ...prev, [memberId]: '' }));

    try {
      await removeProjectMember(projectId, memberId);
      await loadData();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to remove member';
      setMemberActionErrors((prev) => ({ ...prev, [memberId]: message }));
    }
  };

  if (loading) return <p>Loading project...</p>;
  if (pageError) return <p role="alert">{pageError}</p>;
  if (!project) return null;

  const existingMemberUserIds = new Set(members.map((m) => m.user._id));
  const addableOrgMembers = orgMembers.filter(
    (m) => !existingMemberUserIds.has(m.user._id),
  );

  return (
    <div>
      <h1>
        {project.name} {project.status === 'archived' && <em>(archived)</em>}
      </h1>
      <p>{project.description}</p>
      <p>
        <Link to={`/projects/${projectId}/tasks`}>Task List</Link>
        {' · '}
        <Link to={`/projects/${projectId}/kanban`}>Kanban Board</Link>
      </p>

      <section>
        <h2>Dashboard</h2>
        {dashboard && (
          <ul>
            <li>Team size: {dashboard.teamSize}</li>
            <li>Total tasks: {dashboard.taskStats.total}</li>
            <li>Completed: {dashboard.taskStats.completed}</li>
            <li>Completion: {dashboard.progress.completionPercentage}%</li>
          </ul>
        )}
        <p>
          <em>Task and activity stats will populate once Task Management (Phase 5) ships.</em>
        </p>
      </section>

      {/* Settings + archive: projects:update / projects:archive — owner/admin only */}
      <RequireRole allowedRoles={['owner', 'admin']}>
        <section>
          <h2>Project Settings</h2>
          <form onSubmit={handleSettingsSave}>
            <div>
              <label htmlFor="settings-name">Name</label>
              <input
                id="settings-name"
                name="name"
                type="text"
                value={settingsForm.name}
                onChange={handleSettingsChange}
                required
              />
            </div>

            <div>
              <label htmlFor="settings-description">Description</label>
              <textarea
                id="settings-description"
                name="description"
                value={settingsForm.description}
                onChange={handleSettingsChange}
              />
            </div>

            {settingsError && <p role="alert">{settingsError}</p>}

            <button type="submit" disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          <p>
            <button type="button" onClick={handleArchiveToggle} disabled={archiving}>
              {project.status === 'archived' ? 'Unarchive Project' : 'Archive Project'}
            </button>
          </p>
          {archiveError && <p role="alert">{archiveError}</p>}
        </section>
      </RequireRole>

      <section>
        <h2>Project Members</h2>

        <ul>
          {members.map((member) => (
            <li key={member._id}>
              {member.user.name} ({member.user.email})
              {/* Remove is project_members:manage — owner/admin/manager */}
              <RequireRole allowedRoles={['owner', 'admin', 'manager']}>
                {' '}
                <button type="button" onClick={() => handleRemoveMember(member._id)}>
                  Remove
                </button>
              </RequireRole>
              {memberActionErrors[member._id] && (
                <p role="alert">{memberActionErrors[member._id]}</p>
              )}
            </li>
          ))}
        </ul>

        {/* Add is project_members:manage — owner/admin/manager.
            Only existing ORG members who aren't already on the
            project are offered — matches the backend constraint
            that project membership is a subset of org membership. */}
        <RequireRole allowedRoles={['owner', 'admin', 'manager']}>
          <h3>Add a member from the organization</h3>
          {addableOrgMembers.length === 0 ? (
            <p>Every organization member is already on this project.</p>
          ) : (
            <form onSubmit={handleAddMember}>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Choose a member...</option>
                {addableOrgMembers.map((m) => (
                  <option key={m.user._id} value={m.user._id}>
                    {m.user.name} ({m.role})
                  </option>
                ))}
              </select>

              {addMemberError && <p role="alert">{addMemberError}</p>}

              <button type="submit" disabled={addingMember}>
                {addingMember ? 'Adding...' : 'Add to Project'}
              </button>
            </form>
          )}
        </RequireRole>
      </section>
    </div>
  );
};

export default ProjectDetail;