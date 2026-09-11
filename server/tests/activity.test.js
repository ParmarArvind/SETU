import request from 'supertest';
import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  startTestDb,
  stopTestDb,
  clearTestDb,
} from './testDb.js';

import {
  registerUser,
  createOrganization,
  createProject,
  createTask,
} from './helpers.js';

import Activity from '../models/Activity.js';

let app;

beforeAll(async () => {
  await startTestDb();

  const imported = await import('../app.js');

  app = imported.default;
});

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('Activity Tracking', () => {
  it('records project activity when a task is created', async () => {
    const owner = await registerUser(app);

    const {
      organization,
    } = await createOrganization(
      app,
      owner.token,
    );

    const {
      project,
    } = await createProject(
      app,
      owner.token,
      organization._id,
    );

    await createTask(
      app,
      owner.token,
      project._id,
      {
        title: 'Activity Test Task',
      },
    );

    const activity =
      await Activity.find({
        project: project._id,
      });

    expect(activity.length).toBeGreaterThan(0);

    const taskActivity =
      activity.find(
        (item) =>
          item.action === 'task.created',
      );

    expect(taskActivity).toBeTruthy();

    expect(
      taskActivity.metadata.taskTitle,
    ).toBe('Activity Test Task');
  });

  it('returns project activity only to authorized project users', async () => {
    const owner = await registerUser(
      app,
      {
        name: 'Project Owner',
      },
    );

    const outsider = await registerUser(
      app,
      {
        name: 'Outsider',
      },
    );

    const {
      organization,
    } = await createOrganization(
      app,
      owner.token,
    );

    const {
      project,
    } = await createProject(
      app,
      owner.token,
      organization._id,
    );

    const response =
      await request(app)
        .get(
          `/api/projects/${project._id}/activity`,
        )
        .set(
          'Authorization',
          `Bearer ${outsider.token}`,
        );

    expect(response.status).toBe(403);
  });

  it('returns project activity to the project owner', async () => {
    const owner = await registerUser(app);

    const {
      organization,
    } = await createOrganization(
      app,
      owner.token,
    );

    const {
      project,
    } = await createProject(
      app,
      owner.token,
      organization._id,
    );

    await createTask(
      app,
      owner.token,
      project._id,
      {
        title: 'Activity Task',
      },
    );

    const response =
      await request(app)
        .get(
          `/api/projects/${project._id}/activity`,
        )
        .set(
          'Authorization',
          `Bearer ${owner.token}`,
        );

    expect(response.status).toBe(200);

    expect(
      response.body.success,
    ).toBe(true);

    expect(
      response.body.data.activities.length,
    ).toBeGreaterThan(0);
  });

  it('supports pagination', async () => {
    const owner = await registerUser(app);

    const {
      organization,
    } = await createOrganization(
      app,
      owner.token,
    );

    const {
      project,
    } = await createProject(
      app,
      owner.token,
      organization._id,
    );

    await createTask(
      app,
      owner.token,
      project._id,
      {
        title: 'Task One',
      },
    );

    await createTask(
      app,
      owner.token,
      project._id,
      {
        title: 'Task Two',
      },
    );

    const response =
      await request(app)
        .get(
          `/api/projects/${project._id}/activity?page=1&limit=1`,
        )
        .set(
          'Authorization',
          `Bearer ${owner.token}`,
        );

    expect(response.status).toBe(200);

    expect(
      response.body.data.activities,
    ).toHaveLength(1);

    expect(
      response.body.data.pagination.page,
    ).toBe(1);

    expect(
      response.body.data.pagination.limit,
    ).toBe(1);

    expect(
      response.body.data.pagination.total,
    ).toBeGreaterThanOrEqual(2);
  });
});