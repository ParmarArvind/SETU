import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';

import { startTestDb, stopTestDb, clearTestDb } from './testDb.js';
import { registerUser, createOrganization } from './helpers.js';

let app;

// --------------------------------------------------------------
// beforeAll: spin up an in-memory Mongo instance and set the env
// vars config/env.js requires, THEN dynamically import the app.
// Doing this statically at the top of the file would crash, since
// config/env.js throws immediately if MONGODB_URI isn't set yet.
// --------------------------------------------------------------
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

describe('Organization data isolation (FR-07)', () => {
  it('rejects every organization route without a token', async () => {
    const ownerA = await registerUser(app);
    const { organization: orgA } = await createOrganization(app, ownerA.token);

    const responses = await Promise.all([
      request(app).get(`/api/organizations/${orgA._id}`),
      request(app).get(`/api/organizations/${orgA._id}/members`),
      request(app).patch(`/api/organizations/${orgA._id}`).send({ name: 'x' }),
    ]);

    responses.forEach((response) => {
      expect(response.status).toBe(401);
    });
  });

  it('returns 403 when a non-member requests another organization\'s detail', async () => {
    const ownerA = await registerUser(app);
    const { organization: orgA } = await createOrganization(app, ownerA.token);

    const outsider = await registerUser(app);

    const response = await request(app)
      .get(`/api/organizations/${orgA._id}`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('returns 403 when a non-member tries to update another organization', async () => {
    const ownerA = await registerUser(app);
    const { organization: orgA } = await createOrganization(app, ownerA.token);

    const outsider = await registerUser(app);

    const response = await request(app)
      .patch(`/api/organizations/${orgA._id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ name: 'Hijacked Name' });

    expect(response.status).toBe(403);

    // Confirm the name was genuinely untouched, not just that the
    // response code looked right.
    const check = await request(app)
      .get(`/api/organizations/${orgA._id}`)
      .set('Authorization', `Bearer ${ownerA.token}`);

    expect(check.body.data.organization.name).toBe(orgA.name);
  });

  it('returns 403 when a non-member requests another organization\'s member list', async () => {
    const ownerA = await registerUser(app);
    const { organization: orgA } = await createOrganization(app, ownerA.token);

    const outsider = await registerUser(app);

    const response = await request(app)
      .get(`/api/organizations/${orgA._id}/members`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(response.status).toBe(403);
  });

  it('returns 403 when a non-member tries to invite someone into another organization', async () => {
    const ownerA = await registerUser(app);
    const { organization: orgA } = await createOrganization(app, ownerA.token);

    const outsider = await registerUser(app);
    const victim = await registerUser(app);

    const response = await request(app)
      .post(`/api/organizations/${orgA._id}/members`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ email: victim.user.email, role: 'developer' });

    // loadMembership rejects before requirePermission('members:invite')
    // ever runs — the isolation check fires first, regardless of
    // what permission the route would otherwise require.
    expect(response.status).toBe(403);
  });

  it('returns 404 for a well-formed but non-existent organization id', async () => {
    const user = await registerUser(app);
    const fakeId = '507f1f77bcf86cd799439011'; // valid ObjectId shape, doesn't exist

    const response = await request(app)
      .get(`/api/organizations/${fakeId}`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(404);
  });

  it('returns 400 for a malformed organization id', async () => {
    const user = await registerUser(app);

    const response = await request(app)
      .get('/api/organizations/not-a-valid-id')
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(400);
  });

  it('does not leak access just because a user is a member of a different organization', async () => {
    const ownerA = await registerUser(app);
    const { organization: orgA } = await createOrganization(app, ownerA.token);

    const ownerB = await registerUser(app);
    // ownerB is a real, active owner — just of a different org.
    await createOrganization(app, ownerB.token);

    const response = await request(app)
      .get(`/api/organizations/${orgA._id}`)
      .set('Authorization', `Bearer ${ownerB.token}`);

    expect(response.status).toBe(403);
  });

  it('scopes nested member routes to the organization in the URL, not just the memberId', async () => {
    const ownerA = await registerUser(app);
    const { organization: orgA, membership: ownerAMembership } =
      await createOrganization(app, ownerA.token);

    const ownerB = await registerUser(app);
    const { organization: orgB } = await createOrganization(app, ownerB.token);

    // Try to remove Org A's owner membership through Org B's URL.
    // This must 404 (member not found IN THIS organization), never
    // succeed and never leak whether the membership id is valid.
    const removeAttempt = await request(app)
      .delete(`/api/organizations/${orgB._id}/members/${ownerAMembership._id}`)
      .set('Authorization', `Bearer ${ownerB.token}`);

    expect(removeAttempt.status).toBe(404);

    // Same check for role assignment.
    const roleAttempt = await request(app)
      .patch(`/api/organizations/${orgB._id}/members/${ownerAMembership._id}/role`)
      .set('Authorization', `Bearer ${ownerB.token}`)
      .send({ role: 'viewer' });

    expect(roleAttempt.status).toBe(404);

    // Confirm Org A's owner membership is completely untouched.
    const stillOwner = await request(app)
      .get(`/api/organizations/${orgA._id}/members`)
      .set('Authorization', `Bearer ${ownerA.token}`);

    const membershipStillIntact = stillOwner.body.data.members.find(
      (m) => m._id === ownerAMembership._id,
    );

    expect(membershipStillIntact.role).toBe('owner');
  });

  it('grants access once a genuine membership exists, and nothing before that', async () => {
    const ownerA = await registerUser(app);
    const { organization: orgA } = await createOrganization(app, ownerA.token);

    const newMember = await registerUser(app);

    // Before being added: blocked.
    const before = await request(app)
      .get(`/api/organizations/${orgA._id}`)
      .set('Authorization', `Bearer ${newMember.token}`);
    expect(before.status).toBe(403);

    // Owner adds them.
    const addResponse = await request(app)
      .post(`/api/organizations/${orgA._id}/members`)
      .set('Authorization', `Bearer ${ownerA.token}`)
      .send({ email: newMember.user.email, role: 'viewer' });
    expect(addResponse.status).toBe(201);

    // After being added: allowed to view, still blocked from managing.
    const after = await request(app)
      .get(`/api/organizations/${orgA._id}`)
      .set('Authorization', `Bearer ${newMember.token}`);
    expect(after.status).toBe(200);

    const managementAttempt = await request(app)
      .patch(`/api/organizations/${orgA._id}`)
      .set('Authorization', `Bearer ${newMember.token}`)
      .send({ name: 'Should not work' });
    expect(managementAttempt.status).toBe(403);
  });
});