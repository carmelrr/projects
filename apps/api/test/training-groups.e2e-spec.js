const { Test } = require('@nestjs/testing');
const { Reflector } = require('@nestjs/core');
const {
  TrainingGroupsController,
} = require('../dist/modules/training-groups/training-groups.controller');
const {
  TrainingGroupsService,
} = require('../dist/modules/training-groups/training-groups.service');
const { RolesGuard } = require('../dist/common/guards/roles.guard');

class TestAuthGuard {
  constructor(user) {
    this.user = user;
  }

  canActivate(context) {
    context.switchToHttp().getRequest().user = this.user;
    return true;
  }
}

function createServiceMock() {
  return {
    listGroups: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    getGroup: jest.fn().mockResolvedValue({ id: 'group-1' }),
    createGroup: jest.fn().mockResolvedValue({ id: 'group-1', name: 'Spring squad' }),
    updateGroup: jest.fn().mockResolvedValue({ id: 'group-1', name: 'Spring squad' }),
    addMembers: jest.fn().mockResolvedValue({ id: 'group-1', memberCount: 2 }),
    removeMember: jest.fn().mockResolvedValue({ id: 'group-1', memberCount: 1 }),
    assignProgram: jest.fn().mockResolvedValue({ groupId: 'group-1', assignedClientIds: ['client-1'] }),
    deleteGroup: jest.fn().mockResolvedValue(undefined),
  };
}

async function createApp(user, serviceMock = createServiceMock()) {
  const moduleRef = await Test.createTestingModule({
    controllers: [TrainingGroupsController],
    providers: [{ provide: TrainingGroupsService, useValue: serviceMock }],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalGuards(new TestAuthGuard(user), new RolesGuard(app.get(Reflector)));
  await app.init();
  await app.listen(0);
  return { app, serviceMock };
}

async function request(app, path, options = {}) {
  const address = app.getHttpServer().address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

describe('TrainingGroupsController smoke', () => {
  it('lists groups for a coach and forwards coach scope', async () => {
    const user = {
      sub: 'coach-user-1',
      email: 'coach@example.com',
      orgId: 'org-1',
      role: 'COACH',
      coachProfileId: 'coach-profile-1',
    };
    const { app, serviceMock } = await createApp(user);

    try {
      const response = await request(app, '/training-groups');
      expect(response.status).toBe(200);
      expect(serviceMock.listGroups).toHaveBeenCalledWith('org-1', {}, 'COACH', 'coach-profile-1');
    } finally {
      await app.close();
    }
  });

  it('blocks coaches from creating groups', async () => {
    const user = {
      sub: 'coach-user-1',
      email: 'coach@example.com',
      orgId: 'org-1',
      role: 'COACH',
      coachProfileId: 'coach-profile-1',
    };
    const { app, serviceMock } = await createApp(user);

    try {
      const response = await request(app, '/training-groups', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Spring squad',
          coachId: 'coach-profile-1',
          memberClientUserIds: ['client-1'],
        }),
      });
      expect(response.status).toBe(403);
      expect(serviceMock.createGroup).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('creates a group for an admin coach', async () => {
    const user = {
      sub: 'admin-user-1',
      email: 'admin@example.com',
      orgId: 'org-1',
      role: 'ADMIN_COACH',
      coachProfileId: 'coach-profile-admin',
    };
    const { app, serviceMock } = await createApp(user);

    try {
      const payload = {
        name: 'Spring squad',
        coachId: 'coach-profile-1',
        memberClientUserIds: ['client-1', 'client-2'],
        description: 'Shared hypertrophy block',
      };
      const response = await request(app, '/training-groups', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(response.status).toBe(201);
      expect(serviceMock.createGroup).toHaveBeenCalledWith('org-1', 'admin-user-1', payload);
    } finally {
      await app.close();
    }
  });

  it('rejects invalid assign-program payloads', async () => {
    const user = {
      sub: 'admin-user-1',
      email: 'admin@example.com',
      orgId: 'org-1',
      role: 'ADMIN_COACH',
      coachProfileId: 'coach-profile-admin',
    };
    const { app, serviceMock } = await createApp(user);

    try {
      const response = await request(app, '/training-groups/group-1/assign-program', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'program-1',
          startDate: '2026-04-23',
        }),
      });
      expect(response.status).toBe(400);
      expect(serviceMock.assignProgram).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('assigns a program for a coach-owned group with a valid datetime', async () => {
    const user = {
      sub: 'coach-user-1',
      email: 'coach@example.com',
      orgId: 'org-1',
      role: 'COACH',
      coachProfileId: 'coach-profile-1',
    };
    const { app, serviceMock } = await createApp(user);

    try {
      const payload = {
        programId: 'program-1',
        startDate: '2026-04-23T00:00:00.000Z',
      };
      const response = await request(app, '/training-groups/group-1/assign-program', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(response.status).toBe(201);
      expect(serviceMock.assignProgram).toHaveBeenCalledWith(
        'group-1',
        'org-1',
        'coach-user-1',
        'COACH',
        'coach-profile-1',
        payload,
      );
    } finally {
      await app.close();
    }
  });
});