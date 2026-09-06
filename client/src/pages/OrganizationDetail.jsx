import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrganization } from '../context/OrganizationContext';
import RequireRole from '../components/RequireRole';
import {
  getOrganization,
  updateOrganization,
  listMembers,
  addMember,
  removeMember,
  assignRole,
} from '../services/organization.service';

const ORG_ROLES = ['owner', 'admin', 'manager', 'developer', 'qa', 'viewer'];

const OrganizationDetail = () => {
  const { id } = useParams();
  const { selectOrganization } = useOrganization();

  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  // Add-member form state
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'developer' });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Per-member action error (removal / role change) — keyed by member id
  const [memberActionErrors, setMemberActionErrors] = useState({});

  // ------------------------------------------------------------
  // Keep the global "current organization" in sync with whichever
  // org detail page is open, so the switcher/nav stay consistent.
  // ------------------------------------------------------------
  useEffect(() => {
    selectOrganization(id);
  }, [id, selectOrganization]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const [orgResult, membersResult] = await Promise.all([
        getOrganization(id),
        listMembers(id),
      ]);

      setOrganization(orgResult.data.organization);
      setSettingsForm({
        name: orgResult.data.organization.name,
        description: orgResult.data.organization.description || '',
      });
      setMembers(membersResult.data.members);
    } catch (err) {
      setPageError(
        err.response?.data?.message || 'Failed to load organization',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

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
      const result = await updateOrganization(id, settingsForm);
      setOrganization(result.data.organization);
    } catch (err) {
      setSettingsError(
        err.response?.data?.message || 'Failed to update organization',
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleInviteChange = (e) => {
    setInviteForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviting(true);

    try {
      await addMember(id, inviteForm);
      setInviteForm({ email: '', role: 'developer' });
      await loadData();
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId) => {
    setMemberActionErrors((prev) => ({ ...prev, [memberId]: '' }));

    try {
      await removeMember(id, memberId);
      await loadData();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to remove member';
      setMemberActionErrors((prev) => ({ ...prev, [memberId]: message }));
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    setMemberActionErrors((prev) => ({ ...prev, [memberId]: '' }));

    try {
      await assignRole(id, memberId, newRole);
      await loadData();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to change role';
      setMemberActionErrors((prev) => ({ ...prev, [memberId]: message }));
      // Reload anyway so the dropdown snaps back to the real
      // (unchanged) role instead of showing the rejected selection.
      await loadData();
    }
  };

  if (loading) return <p>Loading organization...</p>;
  if (pageError) return <p role="alert">{pageError}</p>;
  if (!organization) return null;

  return (
    <div>
      <h1>{organization.name}</h1>
      <p>
        <Link to={`/organizations/${id}/projects`}>View Projects</Link>
      </p>
      <p>{organization.description}</p>

      {/* --- Settings: owner/admin only. Backend still enforces
          this via requirePermission('organization:manage') even
          if this UI is bypassed. --- */}
      <RequireRole allowedRoles={['owner', 'admin']}>
        <section>
          <h2>Organization Settings</h2>
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
        </section>
      </RequireRole>

      <section>
        <h2>Members</h2>

        <ul>
          {members.map((member) => (
            <li key={member._id}>
              {member.user.name} ({member.user.email}) — {member.status}
              {' '}
              {/* Role dropdown: owner/admin only. A non-owner/admin
                  will just see the role as plain text below. */}
              <RequireRole
                allowedRoles={['owner', 'admin']}
                fallback={<strong>{member.role}</strong>}
              >
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member._id, e.target.value)}
                >
                  {ORG_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </RequireRole>

              <RequireRole allowedRoles={['owner', 'admin']}>
                {' '}
                <button type="button" onClick={() => handleRemove(member._id)}>
                  Remove
                </button>
              </RequireRole>

              {memberActionErrors[member._id] && (
                <p role="alert">{memberActionErrors[member._id]}</p>
              )}
            </li>
          ))}
        </ul>

        {/* --- Invite: owner/admin only (requirePermission('members:invite')) --- */}
        <RequireRole allowedRoles={['owner', 'admin']}>
          <h3>Add a member</h3>
          <form onSubmit={handleInvite}>
            <div>
              <label htmlFor="invite-email">Email</label>
              <input
                id="invite-email"
                name="email"
                type="email"
                value={inviteForm.email}
                onChange={handleInviteChange}
                required
              />
            </div>

            <div>
              <label htmlFor="invite-role">Role</label>
              <select
                id="invite-role"
                name="role"
                value={inviteForm.role}
                onChange={handleInviteChange}
              >
                {ORG_ROLES.filter((role) => role !== 'owner').map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {inviteError && <p role="alert">{inviteError}</p>}

            <button type="submit" disabled={inviting}>
              {inviting ? 'Adding...' : 'Add Member'}
            </button>
          </form>
        </RequireRole>
      </section>
    </div>
  );
};

export default OrganizationDetail;