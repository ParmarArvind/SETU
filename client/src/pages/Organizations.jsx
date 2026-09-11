import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../context/OrganizationContext';
import {
  discoverOrganizations,
  requestToJoin,
} from '../services/organization.service';

const Organizations = () => {
  const {
    organizations,
    loading,
    error,
    selectOrganization,
    createOrganization,
  } = useOrganization();

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState('');

  // A user with an active organization should only manage/open that
  // organization from this page. They should not see controls for
  // creating or joining another organization.
  const hasActiveOrganization = organizations.length > 0;

  const handleSearch = async (event) => {
    event.preventDefault();
    setSearchMessage('');

    if (hasActiveOrganization) return;

    try {
      const response = await discoverOrganizations(search);
      setResults(response.data.organizations);
    } catch (err) {
      setSearchMessage(
        err.response?.data?.message || 'Unable to search organizations',
      );
    }
  };

  const handleJoin = async (organizationId) => {
    if (hasActiveOrganization) return;

    try {
      await requestToJoin(organizationId);
      setSearchMessage('Join request sent.');
    } catch (err) {
      setSearchMessage(
        err.response?.data?.message || 'Unable to send join request',
      );
    }
  };

  const handleChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (hasActiveOrganization) return;

    setCreateError('');
    setCreating(true);

    try {
      const organization = await createOrganization(formData);

      setFormData({
        name: '',
        description: '',
      });

      navigate(`/organizations/${organization._id}`);
    } catch (err) {
      setCreateError(
        err.response?.data?.message || 'Failed to create organization',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = (organizationId) => {
    selectOrganization(organizationId);
    navigate(`/organizations/${organizationId}`);
  };

  return (
    <div className="page page-organizations">
      <div className="page-hero">
        <div>
          <span className="eyebrow">Workspace</span>

          <h1>Your Organizations</h1>

          <p className="page-subtitle">
            Create, open and manage the organizations you work with.
          </p>
        </div>
      </div>

      {loading && (
        <div className="page-state-card">
          Loading organizations...
        </div>
      )}

      {error && (
        <div className="page-state-card page-state-error" role="alert">
          {error}
        </div>
      )}

      {!loading && organizations.length === 0 && (
        <div className="empty-card organization-empty">
          <div className="empty-icon">＋</div>

          <h2>No organizations yet</h2>

          <p>
            You are not currently a member of an active organization.
            You can create one or request to join an existing organization.
          </p>
        </div>
      )}

      {!loading && organizations.length > 0 && (
        <ul className="organization-grid">
          {organizations.map(({ organization, role }) => (
            <li
              key={organization._id}
              className="organization-card"
            >
              <button
                type="button"
                className="organization-card-button"
                onClick={() => handleOpen(organization._id)}
              >
                <span className="organization-icon">
                  {organization.name?.charAt(0)?.toUpperCase() || 'S'}
                </span>

                <span className="organization-card-content">
                  <strong>{organization.name}</strong>

                  <span>
                    {organization.description ||
                      'Organization workspace'}
                  </span>
                </span>

                <span className="organization-arrow">→</span>
              </button>

              <div className="organization-card-footer">
                <span className={`role-badge role-${role}`}>
                  {role}
                </span>

                <span className="organization-open-label">
                  Open workspace
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ---------------------------------------------------------
          DISCOVER / JOIN
          Only visible when the user has NO active organization.
         --------------------------------------------------------- */}
      {!loading && !hasActiveOrganization && (
        <>
          <section className="form-card create-form-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Discover</span>
                <h2>Join an organization</h2>
              </div>
            </div>

            <form onSubmit={handleSearch} className="compact-form">
              <div className="form-field">
                <label htmlFor="organization-search">
                  Organization name
                </label>

                <input
                  id="organization-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search organizations"
                />
              </div>

              <button
                type="submit"
                className="button button-primary"
              >
                Search
              </button>
            </form>

            {searchMessage && (
              <p role="alert">{searchMessage}</p>
            )}

            {results.length > 0 && (
              <ul className="member-list">
                {results.map((organization) => (
                  <li
                    key={organization._id}
                    className="member-row"
                  >
                    <strong>{organization.name}</strong>
                    {' — '}
                    {organization.description ||
                      'Organization workspace'}

                    <button
                      type="button"
                      onClick={() => handleJoin(organization._id)}
                    >
                      Request to Join
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* -------------------------------------------------------
              CREATE ORGANIZATION
              Only visible when the user has NO active organization.
             ------------------------------------------------------- */}
          <section className="form-card create-form-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Create</span>

                <h2>Create a new organization</h2>

                <p className="form-helper">
                  Set up a workspace for your team.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="compact-form">
              <div className="form-field">
                <label htmlFor="organization-name">
                  Organization name
                </label>

                <input
                  id="organization-name"
                  name="name"
                  type="text"
                  placeholder="e.g. SETU Development"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="organization-description">
                  Description
                  <span className="optional-label">
                    Optional
                  </span>
                </label>

                <textarea
                  id="organization-description"
                  name="description"
                  placeholder="What is this organization used for?"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              {createError && (
                <p role="alert">{createError}</p>
              )}

              <div className="create-organization-actions">
                <button
                  type="submit"
                  disabled={creating}
                  className="button button-primary"
                >
                  {creating
                    ? 'Creating...'
                    : 'Create Organization'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
};

export default Organizations;
