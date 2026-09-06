import { useOrganization } from '../context/OrganizationContext';

// --------------------------------------------------------------
// RequireRole
//
// Use INSIDE a page that's already behind <ProtectedRoute> (auth
// is assumed to be checked already). This only gates on org role.
//
// This is a client-side convenience for hiding/disabling controls
// the user can't use — it is NOT the security boundary. The real
// enforcement is the backend's requireRole/requirePermission
// middleware (Milestones 3–6); if someone bypasses this component
// via devtools, the API call still gets rejected server-side.
//
// Usage:
//   <RequireRole allowedRoles={['owner', 'admin']}>
//     <button onClick={handleDelete}>Delete organization</button>
//   </RequireRole>
//
// Optional `fallback` renders instead of nothing when the role
// check fails (e.g. an explanatory message on a full guarded page).
// --------------------------------------------------------------
const RequireRole = ({ allowedRoles, children, fallback = null }) => {
  const { currentRole, loading } = useOrganization();

  if (loading) {
    return null;
  }

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return fallback;
  }

  return children;
};

export default RequireRole;