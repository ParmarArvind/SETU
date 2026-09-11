import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';

import { startTestDb, stopTestDb, clearTestDb } from './testDb.js';
import {
  registerUser,
  createOrganization,
  addOrgMember,
  createProject,
  addProjectMember,
  createTask,
} from './helpers.js';

let app;

beforeAll(async () => {
  await startTestDb();
  const appModule = await import('../app.js');
  app = appModule.default;
});

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('Task data isolation and status-update permission (Phase 5)', () => {
  it('rejects every task route without a token', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);
    const { project } = await createProject(app, owner.token, organization._id);
    const { task } = await createTask(app, owner.token, project._id);

    const responses = await Promise.all([
      request(app).get(`/api/tasks/${task._id}`),
      request(app).patch(`/api/tasks/${task._id}`).send({ title: 'x' }),
      request(app).patch(`/api/tasks/${task._id}/status`).send({ status: 'done' }),
      request(app).get(`/api/projects/${project._id}/tasks`),
      request(app).get(`/api/projects/${project._id}/kanban`),
    ]);

    responses.forEach((response) => expect(response.status).toBe(401));
  });

  it('returns 403 for a task when the caller has no access to its project', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);
    const { project } = await createProject(app, owner.token, organization._id);
    const { task } = await createTask(app, owner.token, project._id);

    const developer = await registerUser(app);
    await addOrgMember(app, owner.token, organization._id, developer.user.email, 'developer');

    const response = await request(app)
      .get(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${developer.token}`);

    expect(response.status).toBe(403);
  });

  it('does not leak a task across projects even for a project member of a different project', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);
    const { project: projectA } = await createProject(app, owner.token, organization._id);
    const { project: projectB } = await createProject(app, owner.token, organization._id);
    const { task: taskInB } = await createTask(app, owner.token, projectB._id);

    const developer = await registerUser(app);
    await addOrgMember(app, owner.token, organization._id, developer.user.email, 'developer');
    await addProjectMember(app, owner.token, projectA._id, developer.user._id);

    const response = await request(app)
      .get(`/api/tasks/${taskInB._id}`)
      .set('Authorization', `Bearer ${developer.token}`);

    expect(response.status).toBe(403);
  });

  it('rejects creating a task with an assignee who is not a member of that project', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);
    const { project } = await createProject(app, owner.token, organization._id);

    const outsider = await registerUser(app);
    await addOrgMember(app, owner.token, organization._id, outsider.user.email, 'developer');

    const response = await request(app)
      .post(`/api/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Some task', assignee: outsider.user._id });

    expect(response.status).toBe(400);
  });

  describe('status update permission (the OR-of-two-rules gate)', () => {
    it('allows a Developer to move their own assigned task', async () => {
      const owner = await registerUser(app);
      const { organization } = await createOrganization(app, owner.token);
      const { project } = await createProject(app, owner.token, organization._id);

      const developer = await registerUser(app);
      await addOrgMember(app, owner.token, organization._id, developer.user.email, 'developer');
      await addProjectMember(app, owner.token, project._id, developer.user._id);

      const { task } = await createTask(app, owner.token, project._id, {
        assignee: developer.user._id,
      });

      const response = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${developer.token}`)
        .send({ status: 'in_progress' });

      expect(response.status).toBe(200);
      expect(response.body.data.task.status).toBe('in_progress');
    });

    it('rejects a Developer moving a task assigned to someone else', async () => {
      const owner = await registerUser(app);
      const { organization } = await createOrganization(app, owner.token);
      const { project } = await createProject(app, owner.token, organization._id);

      const developerA = await registerUser(app);
      await addOrgMember(app, owner.token, organization._id, developerA.user.email, 'developer');
      await addProjectMember(app, owner.token, project._id, developerA.user._id);

      const developerB = await registerUser(app);
      await addOrgMember(app, owner.token, organization._id, developerB.user.email, 'developer');
      await addProjectMember(app, owner.token, project._id, developerB.user._id);

      const { task } = await createTask(app, owner.token, project._id, {
        assignee: developerA.user._id,
      });

      const response = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${developerB.token}`)
        .send({ status: 'done' });

      expect(response.status).toBe(403);
    });

    it('allows Owner/Admin to move any task regardless of assignee', async () => {
      const owner = await registerUser(app);
      const { organization } = await createOrganization(app, owner.token);
      const { project } = await createProject(app, owner.token, organization._id);

      const developer = await registerUser(app);
      await addOrgMember(app, owner.token, organization._id, developer.user.email, 'developer');
      await addProjectMember(app, owner.token, project._id, developer.user._id);

      const { task } = await createTask(app, owner.token, project._id, {
        assignee: developer.user._id,
      });

      const response = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ status: 'done' });

      expect(response.status).toBe(200);
    });

    it('rejects an unassigned task move from a Developer with only tasks:update_own_status', async () => {
      const owner = await registerUser(app);
      const { organization } = await createOrganization(app, owner.token);
      const { project } = await createProject(app, owner.token, organization._id);

      const developer = await registerUser(app);
      await addOrgMember(app, owner.token, organization._id, developer.user.email, 'developer');
      await addProjectMember(app, owner.token, project._id, developer.user._id);

      const { task } = await createTask(app, owner.token, project._id);

      const response = await request(app)
        .patch(`/api/tasks/${task._id}/status`)
        .set('Authorization', `Bearer ${developer.token}`)
        .send({ status: 'in_progress' });

      expect(response.status).toBe(403);
    });
  });

  describe('search, filter, and pagination (FR-21, FR-22, FR-23)', () => {
    it('filters by status, priority, and assignee correctly', async () => {
      const owner = await registerUser(app);
      const { organization } = await createOrganization(app, owner.token);
      const { project } = await createProject(app, owner.token, organization._id);

      const developer = await registerUser(app);
      await addOrgMember(app, owner.token, organization._id, developer.user.email, 'developer');
      await addProjectMember(app, owner.token, project._id, developer.user._id);

      await createTask(app, owner.token, project._id, {
        title: 'Fix login bug',
        status: 'todo',
        priority: 'high',
        assignee: developer.user._id,
      });
      await createTask(app, owner.token, project._id, {
        title: 'Write onboarding docs',
        status: 'done',
        priority: 'low',
      });

      const statusFiltered = await request(app)
        .get(`/api/projects/${project._id}/tasks?status=todo`)
        .set('Authorization', `Bearer ${owner.token}`);
      expect(statusFiltered.body.data.tasks).toHaveLength(1);
      expect(statusFiltered.body.data.tasks[0].title).toBe('Fix login bug');

      const priorityFiltered = await request(app)
        .get(`/api/projects/${project._id}/tasks?priority=low`)
        .set('Authorization', `Bearer ${owner.token}`);
      expect(priorityFiltered.body.data.tasks).toHaveLength(1);
      expect(priorityFiltered.body.data.tasks[0].title).toBe('Write onboarding docs');

      const assigneeFiltered = await request(app)
        .get(`/api/projects/${project._id}/tasks?assignee=${developer.user._id}`)
        .set('Authorization', `Bearer ${owner.token}`);
      expect(assigneeFiltered.body.data.tasks).toHaveLength(1);
      expect(assigneeFiltered.body.data.tasks[0].title).toBe('Fix login bug');

      const unassignedFiltered = await request(app)
        .get(`/api/projects/${project._id}/tasks?assignee=unassigned`)
        .set('Authorization', `Bearer ${owner.token}`);
      expect(unassignedFiltered.body.data.tasks).toHaveLength(1);
      expect(unassignedFiltered.body.data.tasks[0].title).toBe('Write onboarding docs');
    });

    it('searches title and description case-insensitively', async () => {
      const owner = await registerUser(app);
      const { organization } = await createOrganization(app, owner.token);
      const { project } = await createProject(app, owner.token, organization._id);

      await createTask(app, owner.token, project._id, {
        title: 'Refactor authentication middleware',
      });
      await createTask(app, owner.token, project._id, {
        title: 'Update README',
        description: 'Mention the new AUTHENTICATION flow',
      });
      await createTask(app, owner.token, project._id, { title: 'Unrelated task' });

      const response = await request(app)
        .get(`/api/projects/${project._id}/tasks?search=authentication`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(response.body.data.tasks).toHaveLength(2);
    });

    it('filters by label', async () => {
      const owner = await registerUser(app);
      const { organization } = await createOrganization(app, owner.token);
      const { project } = await createProject(app, owner.token, organization._id);

      await createTask(app, owner.token, project._id, {
        title: 'A',
        labels: ['bug', 'frontend'],
      });
      await createTask(app, owner.token, project._id, {
        title: 'B',
        labels: ['feature'],
      });

      const response = await request(app)
        .get(`/api/projects/${project._id}/tasks?label=bug`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(response.body.data.tasks).toHaveLength(1);
      expect(response.body.data.tasks[0].title).toBe('A');
    });

    it('rejects an invalid status or priority filter with 400', async () => {
      const owner = await registerUser(app);
      const { organization } = await createOrganization(app, owner.token);
      const { project } = await createProject(app, owner.token, organization._id);

      const badStatus = await request(app)
        .get(`/api/projects/${project._id}/tasks?status=not-a-real-status`)
        .set('Authorization', `Bearer ${owner.token}`);
      expect(badStatus.status).toBe(400);

      const badPriority = await request(app)
        .get(`/api/projects/${project._id}/tasks?priority=urgent-ish`)
        .set('Authorization', `Bearer ${owner.token}`);
      expect(badPriority.status).toBe(400);
    });

    it('paginates correctly and reports accurate totals', async () => {
      const owner = await registerUser(app);
      const { organization } = await createOrganization(app, owner.token);
      const { project } = await createProject(app, owner.token, organization._id);

      for (let i = 0; i < 5; i += 1) {
        await createTask(app, owner.token, project._id, { title: `Task ${i}` });
      }

      const firstPage = await request(app)
        .get(`/api/projects/${project._id}/tasks?limit=2&page=1`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(firstPage.body.data.tasks).toHaveLength(2);
      expect(firstPage.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });

      const lastPage = await request(app)
        .get(`/api/projects/${project._id}/tasks?limit=2&page=3`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(lastPage.body.data.tasks).toHaveLength(1);
    });

    it('caps limit at 100 even if a larger value is requested', async () => {
      const owner = await registerUser(app);
      const { organization } = await createOrganization(app, owner.token);
      const { project } = await createProject(app, owner.token, organization._id);

      const response = await request(app)
        .get(`/api/projects/${project._id}/tasks?limit=5000`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(response.body.data.pagination.limit).toBe(100);
    });
  });

  it('groups the Kanban board into the four columns in status order', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);
    const { project } = await createProject(app, owner.token, organization._id);

    await createTask(app, owner.token, project._id, { title: 'A', status: 'todo' });
    await createTask(app, owner.token, project._id, { title: 'B', status: 'done' });

    const response = await request(app)
      .get(`/api/projects/${project._id}/kanban`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
    const statuses = response.body.data.columns.map((c) => c.status);
    expect(statuses).toEqual(['todo', 'in_progress', 'in_review', 'done']);

    const todoColumn = response.body.data.columns.find((c) => c.status === 'todo');
    expect(todoColumn.tasks).toHaveLength(1);
    expect(todoColumn.label).toBe('To Do');
  });
});