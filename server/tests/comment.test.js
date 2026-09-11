import request from 'supertest';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  startTestDb,
  stopTestDb,
  clearTestDb,
} from './testDb.js';

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

  const imported = await import('../app.js');

  app = imported.default;
});

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe('Task comments', () => {
  it('allows an authorized project member to create and read comments', async () => {
    const owner = await registerUser(app, {
      name: 'Owner User',
    });

    const developer = await registerUser(app, {
      name: 'Developer User',
    });

    const { organization } =
      await createOrganization(
        app,
        owner.token,
      );

    await addOrgMember(
      app,
      owner.token,
      organization._id,
      developer.user.email,
      'developer',
    );

    const { project } =
      await createProject(
        app,
        owner.token,
        organization._id,
      );

    await addProjectMember(
      app,
      owner.token,
      project._id,
      developer.user._id,
    );

    const { task } =
      await createTask(
        app,
        owner.token,
        project._id,
      );

    const createResponse =
      await request(app)
        .post(
          `/api/tasks/${task._id}/comments`,
        )
        .set(
          'Authorization',
          `Bearer ${developer.token}`,
        )
        .send({
          content: 'This task looks good.',
        });

    expect(createResponse.status).toBe(201);
    expect(
      createResponse.body.success,
    ).toBe(true);

    expect(
      createResponse.body.data.comment.content,
    ).toBe('This task looks good.');

    const getResponse =
      await request(app)
        .get(
          `/api/tasks/${task._id}/comments`,
        )
        .set(
          'Authorization',
          `Bearer ${developer.token}`,
        );

    expect(getResponse.status).toBe(200);

    expect(
      getResponse.body.data.comments,
    ).toHaveLength(1);

    expect(
      getResponse.body.data.comments[0].content,
    ).toBe('This task looks good.');
  });

  it('rejects empty comments', async () => {
    const owner = await registerUser(app);

    const { organization } =
      await createOrganization(
        app,
        owner.token,
      );

    const { project } =
      await createProject(
        app,
        owner.token,
        organization._id,
      );

    const { task } =
      await createTask(
        app,
        owner.token,
        project._id,
      );

    const response =
      await request(app)
        .post(
          `/api/tasks/${task._id}/comments`,
        )
        .set(
          'Authorization',
          `Bearer ${owner.token}`,
        )
        .send({
          content: '   ',
        });

    expect(response.status).toBe(400);
  });

  it('allows the author to update their own comment', async () => {
    const owner = await registerUser(app);

    const { organization } =
      await createOrganization(
        app,
        owner.token,
      );

    const { project } =
      await createProject(
        app,
        owner.token,
        organization._id,
      );

    const { task } =
      await createTask(
        app,
        owner.token,
        project._id,
      );

    const createResponse =
      await request(app)
        .post(
          `/api/tasks/${task._id}/comments`,
        )
        .set(
          'Authorization',
          `Bearer ${owner.token}`,
        )
        .send({
          content: 'Original comment',
        });

    const commentId =
      createResponse.body.data.comment._id;

    const updateResponse =
      await request(app)
        .patch(
          `/api/tasks/${task._id}/comments/${commentId}`,
        )
        .set(
          'Authorization',
          `Bearer ${owner.token}`,
        )
        .send({
          content: 'Updated comment',
        });

    expect(updateResponse.status).toBe(200);

    expect(
      updateResponse.body.data.comment.content,
    ).toBe('Updated comment');
  });

  it('allows the author to delete their own comment', async () => {
    const owner = await registerUser(app);

    const { organization } =
      await createOrganization(
        app,
        owner.token,
      );

    const { project } =
      await createProject(
        app,
        owner.token,
        organization._id,
      );

    const { task } =
      await createTask(
        app,
        owner.token,
        project._id,
      );

    const createResponse =
      await request(app)
        .post(
          `/api/tasks/${task._id}/comments`,
        )
        .set(
          'Authorization',
          `Bearer ${owner.token}`,
        )
        .send({
          content: 'Delete me',
        });

    const commentId =
      createResponse.body.data.comment._id;

    const deleteResponse =
      await request(app)
        .delete(
          `/api/tasks/${task._id}/comments/${commentId}`,
        )
        .set(
          'Authorization',
          `Bearer ${owner.token}`,
        );

    expect(deleteResponse.status).toBe(200);

    const getResponse =
      await request(app)
        .get(
          `/api/tasks/${task._id}/comments`,
        )
        .set(
          'Authorization',
          `Bearer ${owner.token}`,
        );

    expect(
      getResponse.body.data.comments,
    ).toHaveLength(0);
  });

  it('prevents a user outside the project from accessing comments', async () => {
    const owner = await registerUser(app, {
      name: 'Project Owner',
    });

    const outsider = await registerUser(app, {
      name: 'Outsider',
    });

    const { organization } =
      await createOrganization(
        app,
        owner.token,
      );

    const { project } =
      await createProject(
        app,
        owner.token,
        organization._id,
      );

    const { task } =
      await createTask(
        app,
        owner.token,
        project._id,
      );

    const response =
      await request(app)
        .get(
          `/api/tasks/${task._id}/comments`,
        )
        .set(
          'Authorization',
          `Bearer ${outsider.token}`,
        );

    expect(response.status).toBe(403);
  });

  it('prevents a viewer from creating comments', async () => {
    const owner = await registerUser(app);

    const viewer = await registerUser(app, {
      name: 'Viewer User',
    });

    const { organization } =
      await createOrganization(
        app,
        owner.token,
      );

    await addOrgMember(
      app,
      owner.token,
      organization._id,
      viewer.user.email,
      'viewer',
    );

    const { project } =
      await createProject(
        app,
        owner.token,
        organization._id,
      );

    await addProjectMember(
      app,
      owner.token,
      project._id,
      viewer.user._id,
    );

    const { task } =
      await createTask(
        app,
        owner.token,
        project._id,
      );

    const response =
      await request(app)
        .post(
          `/api/tasks/${task._id}/comments`,
        )
        .set(
          'Authorization',
          `Bearer ${viewer.token}`,
        )
        .send({
          content: 'Viewer comment',
        });

    expect(response.status).toBe(403);
  });
});