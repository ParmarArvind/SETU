import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  listProjects as apiListProjects,
  createProject as apiCreateProject,
} from '../services/project.service';
import { useOrganization } from './OrganizationContext';

const ProjectContext = createContext(null);

// --------------------------------------------------------------
// ProjectProvider
//
// Must be nested INSIDE OrganizationProvider — the project list is
// always scoped to whichever organization is currently selected
// there. Switching organizations automatically reloads projects;
// there is no separate "select an org for projects" step.
// --------------------------------------------------------------
export const ProjectProvider = ({ children }) => {
  const { currentOrganizationId } = useOrganization();

  const [projects, setProjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshProjects = useCallback(async () => {
    if (!currentOrganizationId) {
      setProjects([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await apiListProjects(currentOrganizationId, statusFilter);
      setProjects(result.data.projects);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, statusFilter]);

  // Reload whenever the selected organization or status filter changes.
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const createProject = async (payload) => {
    const result = await apiCreateProject(currentOrganizationId, payload);
    await refreshProjects();
    return result.data.project;
  };

  const value = {
    projects,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    refreshProjects,
    createProject,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};