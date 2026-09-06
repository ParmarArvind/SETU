import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const {
    organizations,
    currentOrganizationId,
    currentRole,
    selectOrganization,
  } = useOrganization();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleSwitch = (e) => {
    const organizationId = e.target.value;
    selectOrganization(organizationId);
    navigate(`/organizations/${organizationId}`);
  };

  return (
    <div>
      <h1>Welcome to SETU, {user?.name}</h1>

      {organizations.length > 0 && (
        <p>
          Organization:{' '}
          <select value={currentOrganizationId || ''} onChange={handleSwitch}>
            {organizations.map(({ organization }) => (
              <option key={organization._id} value={organization._id}>
                {organization.name}
              </option>
            ))}
          </select>{' '}
          {currentRole && <em>({currentRole})</em>}
        </p>
      )}

      <p>
        <Link to="/organizations">Manage organizations</Link>
      </p>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Dashboard;