import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <h1>Welcome to SETU, {user?.name}</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Dashboard;