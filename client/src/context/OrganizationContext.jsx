import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  listOrganizations as apiListOrganizations,
  createOrganization as apiCreateOrganization,
} from '../services/organization.service';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext(null);

const CURRENT_ORG_KEY = 'setu_current_org_id';

// --------------------------------------------------------------
// OrganizationProvider
//
// Holds:
//   organizations       -> [{ organization, role }] for every org
//                          the user belongs to (from GET /organizations)
//   currentOrganizationId
//   currentMembership    -> { organization, role } for the selected org,
//                            derived from `organizations`, never fetched
//                            separately — this is what RequireRole reads
//
// Must be nested INSIDE AuthProvider — it only loads data once a
// user is authenticated, and clears everything on logout.
// --------------------------------------------------------------
export const OrganizationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [organizations, setOrganizations] = useState([]);
  const [currentOrganizationId, setCurrentOrganizationId] = useState(
    () => localStorage.getItem(CURRENT_ORG_KEY) || null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ------------------------------------------------------------
  // refreshOrganizations: re-fetch the membership list from the
  // backend. Called after create/join/leave so the UI always
  // reflects the server's view, not an optimistic guess.
  // ------------------------------------------------------------
  const refreshOrganizations = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await apiListOrganizations();
      const fetched = result.data.organizations;
      setOrganizations(fetched);

      // If the previously-selected org is no longer in the list
      // (e.g. the user was removed from it), fall back to the
      // first available org rather than pointing at nothing.
      setCurrentOrganizationId((previousId) => {
        const stillValid = fetched.some(
          (entry) => entry.organization._id === previousId,
        );

        if (stillValid) return previousId;

        return fetched.length > 0 ? fetched[0].organization._id : null;
      });
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load organizations',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load organizations once the user is authenticated; clear
  // everything on logout so no stale org data survives a session switch.
  useEffect(() => {
    if (isAuthenticated) {
      refreshOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrganizationId(null);
      setLoading(false);
    }
  }, [isAuthenticated, refreshOrganizations]);

  // Persist the current selection so a page refresh doesn't
  // dump the user back to "no organization selected".
  useEffect(() => {
    if (currentOrganizationId) {
      localStorage.setItem(CURRENT_ORG_KEY, currentOrganizationId);
    } else {
      localStorage.removeItem(CURRENT_ORG_KEY);
    }
  }, [currentOrganizationId]);

  // ------------------------------------------------------------
  // selectOrganization: switch the active org (e.g. from a
  // switcher dropdown, or when navigating to /organizations/:id)
  // ------------------------------------------------------------
  const selectOrganization = (organizationId) => {
    setCurrentOrganizationId(organizationId);
  };

  // ------------------------------------------------------------
  // createOrganization: create, then refresh + select the new org
  // ------------------------------------------------------------
  const createOrganization = async ({ name, description }) => {
    const result = await apiCreateOrganization({ name, description });
    await refreshOrganizations();
    setCurrentOrganizationId(result.data.organization._id);
    return result.data.organization;
  };

  const currentMembership =
    organizations.find(
      (entry) => entry.organization._id === currentOrganizationId,
    ) || null;

  const value = {
    organizations,
    currentOrganizationId,
    currentOrganization: currentMembership?.organization || null,
    currentRole: currentMembership?.role || null,
    loading,
    error,
    selectOrganization,
    createOrganization,
    refreshOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

// --------------------------------------------------------------
// useOrganization: the hook components will actually use
// --------------------------------------------------------------
export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};