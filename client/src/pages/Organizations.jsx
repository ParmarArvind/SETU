import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../context/OrganizationContext';

const Organizations = () => {
  const {
    organizations,
    loading,
    error,
    selectOrganization,
    createOrganization,
  } = useOrganization();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const organization = await createOrganization(formData);
      setFormData({ name: '', description: '' });
      navigate(`/organizations/${organization._id}`);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to create organization';
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = (organizationId) => {
    selectOrganization(organizationId);
    navigate(`/organizations/${organizationId}`);
  };

  return (
    <div>
      <h1>Your Organizations</h1>

      {loading && <p>Loading organizations...</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && organizations.length === 0 && (
        <p>You don't belong to any organization yet. Create one below.</p>
      )}

      <ul>
        {organizations.map(({ organization, role }) => (
          <li key={organization._id}>
            <button type="button" onClick={() => handleOpen(organization._id)}>
              {organization.name}
            </button>{' '}
            — <em>{role}</em>
          </li>
        ))}
      </ul>

      <h2>Create a new organization</h2>

      <form onSubmit={handleCreate}>
        <div>
          <label htmlFor="name">Organization name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        {createError && <p role="alert">{createError}</p>}

        <button type="submit" disabled={creating}>
          {creating ? 'Creating...' : 'Create Organization'}
        </button>
      </form>
    </div>
  );
};

export default Organizations;