import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';

import { startTestDb, stopTestDb, clearTestDb } from './testDb.js';
import {
  registerUser,
  createOrganization,
  addOrgMember,
  createProject,
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

describe('Project data isolation and visibility (FR-07, Milestone 2 visibility rule)', () => {
  it('rejects every project route without a token', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);
    const { project } = await createProject(app, owner.token, organization._id);

    const responses = await Promise.all([
      request(app).get(`/api/projects/${project._id}`),
      request(app).get(`/api/projects/${project._id}/dashboard`),
      request(app).get(`/api/projects/${project._id}/members`),
      request(app).patch(`/api/projects/${project._id}`).send({ name: 'x' }),
    ]);

    responses.forEach((response) => expect(response.status).toBe(401));
  });

  it('returns 403 when a user outside the organization requests the project', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);
    const { project } = await createProject(app, owner.token, organization._id);

    const outsider = await registerUser(app);

    const response = await request(app)
      .get(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 when a real org member has no project access (visibility rule)', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);
    const { project } = await createProject(app, owner.token, organization._id);

    // Developer is a genuine, active member of the ORGANIZATION,
    // but was never added to this specific PROJECT.
    const developer = await registerUser(app);
    await addOrgMember(app, owner.token, organization._id, developer.user.email, 'developer');

    const response = await request(app)
      .get(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${developer.token}`);

    expect(response.status).toBe(403);
  });

  it('grants Owner/Admin visibility into a project with no explicit ProjectMember record', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);

    // An Admin who did NOT create this project and was never added
    // as a ProjectMember should still see it, per PROJECT_VISIBLE_TO_ALL_ROLES.
    const admin = await registerUser(app);
    await addOrgMember(app, owner.token, organization._id, admin.user.email, 'admin');

    const { project } = await createProject(app, owner.token, organization._id);

    const response = await request(app)
      .get(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.projectMembership).toBeNull();
  });

  it('grants access once added as a ProjectMember, and not before', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);
    const { project } = await createProject(app, owner.token, organization._id);

    const developer = await registerUser(app);
    await addOrgMember(app, owner.token, organization._id, developer.user.email, 'developer');

    const before = await request(app)
      .get(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${developer.token}`);
    expect(before.status).toBe(403);

    const addResponse = await request(app)
      .post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: developer.user._id || developer.user.id });

    expect(addResponse.status).toBe(201);

    const after = await request(app)
      .get(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${developer.token}`);
    expect(after.status).toBe(200);
  });

  it('rejects adding a user to a project if they are not an organization member', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);
    const { project } = await createProject(app, owner.token, organization._id);

    // Registered in the system, but never added to this organization.
    const stranger = await registerUser(app);

    const response = await request(app)
      .post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ userId: stranger.user._id || stranger.user.id });

    expect(response.status).toBe(400);
  });

  it('returns 404 for a well-formed but non-existent project id, 400 for a malformed one', async () => {
    const user = await registerUser(app);

    const notFound = await request(app)
      .get('/api/projects/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${user.token}`);
    expect(notFound.status).toBe(404);

    const malformed = await request(app)
      .get('/api/projects/not-a-valid-id')
      .set('Authorization', `Bearer ${user.token}`);
    expect(malformed.status).toBe(400);
  });

  it('scopes nested project member routes to the project in the URL, not just the memberId', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);

    const { project: projectA, membership: ownerMembershipOnA } = await createProject(
      app,
      owner.token,
      organization._id,
    );
    const { project: projectB } = await createProject(app, owner.token, organization._id);

    // Try to remove Project A's membership record through Project B's URL.
    const response = await request(app)
      .delete(`/api/projects/${projectB._id}/members/${ownerMembershipOnA._id}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(404);

    // Confirm Project A's membership is untouched.
    const stillThere = await request(app)
      .get(`/api/projects/${projectA._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`);

    const found = stillThere.body.data.members.find(
      (m) => m._id === ownerMembershipOnA._id,
    );
    expect(found).toBeDefined();
  });

  it('does not leak a project across organizations even for a genuine owner of another org', async () => {
    const ownerA = await registerUser(app);
    const { organization: orgA } = await createOrganization(app, ownerA.token);
    const { project: projectA } = await createProject(app, ownerA.token, orgA._id);

    const ownerB = await registerUser(app);
    await createOrganization(app, ownerB.token); // ownerB owns a real, unrelated org

    const response = await request(app)
      .get(`/api/projects/${projectA._id}`)
      .set('Authorization', `Bearer ${ownerB.token}`);

    expect(response.status).toBe(403);
  });

  it('excludes archived projects from the default list but includes them with status=all', async () => {
    const owner = await registerUser(app);
    const { organization } = await createOrganization(app, owner.token);
    const { project } = await createProject(app, owner.token, organization._id);

    await request(app)
      .patch(`/api/projects/${project._id}/archive`)
      .set('Authorization', `Bearer ${owner.token}`);

    const defaultList = await request(app)
      .get(`/api/organizations/${organization._id}/projects`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(
      defaultList.body.data.projects.find((p) => p._id === project._id),
    ).toBeUndefined();

    const allList = await request(app)
      .get(`/api/organizations/${organization._id}/projects?status=all`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(
      allList.body.data.projects.find((p) => p._id === project._id),
    ).toBeDefined();

    // Direct detail access to an archived project still works —
    // archiving hides it from the list, it isn't a soft-delete.
    const detail = await request(app)
      .get(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(detail.status).toBe(200);
  });
});