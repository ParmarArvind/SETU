import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';

import { useOrganization } from '../context/OrganizationContext';
import { useSocket } from '../context/SocketContext';

import RequireRole from '../components/RequireRole';

import {
  getOrganization,
  updateOrganization,
  listMembers,
  addMember,
  removeMember,
  assignRole,
  listMembershipRequests,
  respondToMembershipRequest,
} from '../services/organization.service';

const ORG_ROLES = [
  'owner',
  'admin',
  'manager',
  'developer',
  'qa',
  'viewer',
];

const OrganizationDetail = () => {
  const { id } = useParams();
  const { selectOrganization } = useOrganization();

  const {
    connected,
    isUserOnline,
  } = useSocket();

  const navigate = useNavigate();

  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    description: '',
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  // Add-member form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'developer',
    validityDays: 7,
  });

  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Per-member action error
  const [memberActionErrors, setMemberActionErrors] = useState({});

  // ------------------------------------------------------------
  // Keep the global current organization in sync with the
  // organization detail page.
  // ------------------------------------------------------------
  useEffect(() => {
    selectOrganization(id);
  }, [id, selectOrganization]);

  // ------------------------------------------------------------
  // Load organization data
  // ------------------------------------------------------------
  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const [
        orgResult,
        membersResult,
        requestsResult,
      ] = await Promise.all([
        getOrganization(id),
        listMembers(id),
        listMembershipRequests(id).catch(() => ({
          data: {
            requests: [],
          },
        })),
      ]);

      const organizationData = orgResult.data.organization;

      setOrganization(organizationData);

      setSettingsForm({
        name: organizationData.name,
        description: organizationData.description || '',
      });

      setMembers(membersResult.data.members);
      setRequests(requestsResult.data.requests);
    } catch (err) {
      setPageError(
        err.response?.data?.message ||
          'Failed to load organization',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ------------------------------------------------------------
  // Settings
  // ------------------------------------------------------------
  const handleSettingsChange = (event) => {
    setSettingsForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSettingsSave = async (event) => {
    event.preventDefault();

    setSettingsError('');
    setSavingSettings(true);

    try {
      const result = await updateOrganization(
        id,
        settingsForm,
      );

      setOrganization(result.data.organization);
    } catch (err) {
      setSettingsError(
        err.response?.data?.message ||
          'Failed to update organization',
      );
    } finally {
      setSavingSettings(false);
    }
  };

  // ------------------------------------------------------------
  // Invitation
  // ------------------------------------------------------------
  const handleInviteChange = (event) => {
    setInviteForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleInvite = async (event) => {
    event.preventDefault();

    setInviteError('');
    setInviting(true);

    try {
      await addMember(id, inviteForm);

      setInviteForm({
        email: '',
        role: 'developer',
        validityDays: 7,
      });

      await loadData();
    } catch (err) {
      setInviteError(
        err.response?.data?.message ||
          'Failed to add member',
      );
    } finally {
      setInviting(false);
    }
  };

  // ------------------------------------------------------------
  // Membership request response
  // ------------------------------------------------------------
  const handleRequestResponse = async (
    requestId,
    action,
  ) => {
    try {
      await respondToMembershipRequest(
        requestId,
        action,
      );

      await loadData();
    } catch (err) {
      setInviteError(
        err.response?.data?.message ||
          'Unable to respond to request',
      );
    }
  };

  // ------------------------------------------------------------
  // Remove member
  // ------------------------------------------------------------
  const handleRemove = async (memberId) => {
    setMemberActionErrors((previous) => ({
      ...previous,
      [memberId]: '',
    }));

    try {
      await removeMember(id, memberId);
      await loadData();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to remove member';

      setMemberActionErrors((previous) => ({
        ...previous,
        [memberId]: message,
      }));
    }
  };

  // ------------------------------------------------------------
  // Change member role
  // ------------------------------------------------------------
  const handleRoleChange = async (
    memberId,
    newRole,
  ) => {
    setMemberActionErrors((previous) => ({
      ...previous,
      [memberId]: '',
    }));

    try {
      await assignRole(
        id,
        memberId,
        newRole,
      );

      await loadData();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'Failed to change role';

      setMemberActionErrors((previous) => ({
        ...previous,
        [memberId]: message,
      }));

      // Reload so the dropdown returns to the actual
      // server-side role.
      await loadData();
    }
  };

  // ------------------------------------------------------------
  // Loading / error states
  // ------------------------------------------------------------
  if (loading) {
    return <p>Loading organization...</p>;
  }

  if (pageError) {
    return (
      <p role="alert">
        {pageError}
      </p>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <div className="page page-organization-detail">

      {/* --------------------------------------------------------
          Organization header
         -------------------------------------------------------- */}
      <div className="page-hero">
        <div>
          <span className="eyebrow">
            Organization
          </span>

          <h1>{organization.name}</h1>

          <p className="page-subtitle">
            {organization.description ||
              'Organization workspace and team management.'}
          </p>
        </div>

        <Link
          className="button button-primary page-action-button"
          to={`/organizations/${id}/projects`}
        >
          View Projects →
        </Link>
      </div>

      {/* --------------------------------------------------------
          Socket connection status
         -------------------------------------------------------- */}
      <div
        className="presence-connection-status"
        aria-live="polite"
      >
        <span
          className={`presence-connection-dot ${
            connected
              ? 'presence-connection-online'
              : 'presence-connection-offline'
          }`}
        />

        <span>
          {connected
            ? 'Real-time presence connected'
            : 'Real-time presence disconnected'}
        </span>
      </div>

      {/* --------------------------------------------------------
          Organization Settings
         -------------------------------------------------------- */}
      <RequireRole allowedRoles={['owner', 'admin']}>
        <section className="form-card">
          <h2>
            Organization Settings
          </h2>

          <form
            onSubmit={handleSettingsSave}
            className="compact-form"
          >
            <div>
              <label htmlFor="settings-name">
                Name
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

            <div>
              <label htmlFor="settings-description">
                Description
              </label>

              <textarea
                id="settings-description"
                name="description"
                value={settingsForm.description}
                onChange={handleSettingsChange}
              />
            </div>

            {settingsError && (
              <p role="alert">
                {settingsError}
              </p>
            )}

            <button
              type="submit"
              disabled={savingSettings}
            >
              {savingSettings
                ? 'Saving...'
                : 'Save Changes'}
            </button>
          </form>
        </section>
      </RequireRole>

      {/* --------------------------------------------------------
          Members
         -------------------------------------------------------- */}
      <section className="members-card">

        <div className="section-heading">
          <div>
            <span className="eyebrow">
              Team
            </span>

            <h2>
              Members
            </h2>
          </div>

          <span className="count-badge">
            {members.length}
          </span>
        </div>

        <ul className="member-list">

          {members.map((member) => {
            const userId = member.user?._id;
            const online = userId
              ? isUserOnline(userId)
              : false;

            return (
              <li
                key={member._id}
                className="member-row"
              >

                {/* ------------------------------------------------
                    Member identity + presence
                   ------------------------------------------------ */}
                <div className="member-identity">

                  <div className="member-name">
                    <strong>
                      {member.user?.name ||
                        'Unknown User'}
                    </strong>

                    <span
                      className={`presence-status ${
                        online
                          ? 'presence-online'
                          : 'presence-offline'
                      }`}
                      title={
                        online
                          ? 'User is currently online'
                          : 'User is currently offline'
                      }
                    >
                      <span className="presence-dot" />

                      {online
                        ? 'Online'
                        : 'Offline'}
                    </span>
                  </div>

                  <span className="member-email">
                    {member.user?.email}
                  </span>

                  <span className="member-membership-status">
                    Membership: {member.status}
                  </span>
                </div>

                {/* ------------------------------------------------
                    Role
                   ------------------------------------------------ */}
                <div className="member-role">

                  <RequireRole
                    allowedRoles={[
                      'owner',
                      'admin',
                    ]}
                    fallback={
                      <strong>
                        {member.role}
                      </strong>
                    }
                  >
                    <select
                      value={member.role}
                      onChange={(event) =>
                        handleRoleChange(
                          member._id,
                          event.target.value,
                        )
                      }
                      aria-label={`Change role for ${
                        member.user?.name ||
                        'member'
                      }`}
                    >
                      {ORG_ROLES.map((role) => (
                        <option
                          key={role}
                          value={role}
                        >
                          {role}
                        </option>
                      ))}
                    </select>
                  </RequireRole>

                </div>

                {/* ------------------------------------------------
                    Remove member
                   ------------------------------------------------ */}
                <RequireRole
                  allowedRoles={[
                    'owner',
                    'admin',
                  ]}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleRemove(member._id)
                    }
                  >
                    Remove
                  </button>
                </RequireRole>

                {/* ------------------------------------------------
                    Action error
                   ------------------------------------------------ */}
                {memberActionErrors[
                  member._id
                ] && (
                  <p role="alert">
                    {
                      memberActionErrors[
                        member._id
                      ]
                    }
                  </p>
                )}

              </li>
            );
          })}

        </ul>

        {/* ------------------------------------------------------
            Invite member
           ------------------------------------------------------ */}
        <RequireRole
          allowedRoles={[
            'owner',
            'admin',
          ]}
        >
          <h3>
            Add a member
          </h3>

          <form
            onSubmit={handleInvite}
            className="compact-form"
          >

            <div>
              <label htmlFor="invite-email">
                Email
              </label>

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
              <label htmlFor="invite-role">
                Role
              </label>

              <select
                id="invite-role"
                name="role"
                value={inviteForm.role}
                onChange={handleInviteChange}
              >
                {ORG_ROLES
                  .filter(
                    (role) => role !== 'owner',
                  )
                  .map((role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {role}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label htmlFor="invite-validity">
                Invitation validity
              </label>

              <select
                id="invite-validity"
                name="validityDays"
                value={
                  inviteForm.validityDays
                }
                onChange={
                  handleInviteChange
                }
              >
                {[3, 7, 14, 30].map(
                  (days) => (
                    <option
                      key={days}
                      value={days}
                    >
                      {days} days
                    </option>
                  ),
                )}
              </select>
            </div>

            {inviteError && (
              <p role="alert">
                {inviteError}
              </p>
            )}

            <button
              type="submit"
              disabled={inviting}
            >
              {inviting
                ? 'Sending...'
                : 'Send Invitation'}
            </button>

          </form>
        </RequireRole>

      </section>

      {/* --------------------------------------------------------
          Membership requests
         -------------------------------------------------------- */}
      <RequireRole
        allowedRoles={[
          'owner',
          'admin',
        ]}
      >
        <section className="members-card">

          <div className="section-heading">
            <div>
              <span className="eyebrow">
                Pending
              </span>

              <h2>
                Membership requests
              </h2>
            </div>

            <span className="count-badge">
              {requests.length}
            </span>
          </div>

          <ul className="member-list">

            {requests.map((request) => (
              <li
                key={request._id}
                className="member-row"
              >

                <div>
                  <strong>
                    {request.user?.name ||
                      request.user?.email}
                  </strong>

                  {' — '}

                  {request.type ===
                  'invitation'
                    ? `invited as ${request.role}`
                    : 'requested to join'}

                  {' · expires '}

                  {new Date(
                    request.expiresAt,
                  ).toLocaleDateString()}
                </div>

                {request.type ===
                  'join_request' && (
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        handleRequestResponse(
                          request._id,
                          'accept',
                        )
                      }
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleRequestResponse(
                          request._id,
                          'reject',
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                )}

              </li>
            ))}

          </ul>

        </section>
      </RequireRole>

    </div>
  );
};

export default OrganizationDetail;