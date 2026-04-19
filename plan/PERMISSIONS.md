# RBAC — Roles and Permissions

## Roles

| Role | Description |
|---|---|
| `OWNER` | App owner. Full access to everything. |
| `ADMIN_COACH` | Senior coach. Can manage all clients and coaches in the org. |
| `COACH` | Standard coach. Only accesses their assigned clients. |
| `CLIENT` | Athlete. Self-service only on their own data. |

---

## Permission Matrix

### Client Management

| Action | OWNER | ADMIN_COACH | COACH | CLIENT |
|---|:---:|:---:|:---:|:---:|
| Create client | ✅ | ✅ | ✅ | ❌ |
| View all clients in org | ✅ | ✅ | ❌ | ❌ |
| View assigned clients only | ✅ | ✅ | ✅ | ❌ |
| Edit client profile | ✅ | ✅ | ✅ (assigned) | ✅ (own) |
| Archive/pause client | ✅ | ✅ | ✅ (assigned) | ❌ |
| Assign coach to client | ✅ | ✅ | ❌ | ❌ |

### Programs & Workouts

| Action | OWNER | ADMIN_COACH | COACH | CLIENT |
|---|:---:|:---:|:---:|:---:|
| Create program/workout template | ✅ | ✅ | ✅ | ❌ |
| View org-wide library | ✅ | ✅ | ✅ | ❌ |
| Edit any org template | ✅ | ✅ | ❌ | ❌ |
| Edit own templates | ✅ | ✅ | ✅ | ❌ |
| Delete template | ✅ | ✅ | ✅ (own) | ❌ |
| Assign program to client | ✅ | ✅ | ✅ (assigned) | ❌ |
| Schedule workout for client | ✅ | ✅ | ✅ (assigned) | ❌ |
| Move own workout on calendar | ❌ | ❌ | ❌ | ✅ (own, limited) |

### Workout Logs

| Action | OWNER | ADMIN_COACH | COACH | CLIENT |
|---|:---:|:---:|:---:|:---:|
| Submit workout log | ❌ | ❌ | ❌ | ✅ (own) |
| View client logs | ✅ | ✅ | ✅ (assigned) | ✅ (own) |
| Add coach feedback on log | ✅ | ✅ | ✅ (assigned) | ❌ |

### Messaging

| Action | OWNER | ADMIN_COACH | COACH | CLIENT |
|---|:---:|:---:|:---:|:---:|
| Message any client | ✅ | ✅ (assigned) | ✅ (assigned) | ❌ |
| Message coach | ❌ | ❌ | ❌ | ✅ (own coach) |
| Create group thread | ✅ | ✅ | ✅ | ❌ |
| Send broadcast | ✅ | ✅ | ❌ | ❌ |

> **Privacy note:** Even ADMIN_COACH messaging is scoped to assigned clients. This prevents privacy issues in multi-coach orgs.

### Metrics & Compliance

| Action | OWNER | ADMIN_COACH | COACH | CLIENT |
|---|:---:|:---:|:---:|:---:|
| Create metric definitions | ✅ | ✅ | ✅ | ❌ |
| Log metrics for client | ✅ | ✅ | ✅ (assigned) | ✅ (own) |
| View client metrics | ✅ | ✅ | ✅ (assigned) | ✅ (own) |
| View compliance dashboard | ✅ | ✅ | ✅ (assigned) | ✅ (own) |

### Habits & Nutrition

| Action | OWNER | ADMIN_COACH | COACH | CLIENT |
|---|:---:|:---:|:---:|:---:|
| Define habits for org | ✅ | ✅ | ✅ | ❌ |
| Log habit entry | ❌ | ❌ | ❌ | ✅ (own) |
| View habit history | ✅ | ✅ | ✅ (assigned) | ✅ (own) |
| Set nutrition goal | ✅ | ✅ | ✅ (assigned) | ❌ |
| Log nutrition entry | ❌ | ❌ | ❌ | ✅ (own) |
| View nutrition data | ✅ | ✅ | ✅ (assigned) | ✅ (own) |

### Exercise Library

| Action | OWNER | ADMIN_COACH | COACH | CLIENT |
|---|:---:|:---:|:---:|:---:|
| View system exercises | ✅ | ✅ | ✅ | ✅ |
| Create custom exercise | ✅ | ✅ | ✅ | ❌ |
| Edit any org exercise | ✅ | ✅ | ❌ | ❌ |
| Edit own exercises | ✅ | ✅ | ✅ | ❌ |
| Delete org exercise | ✅ | ✅ | ✅ (own) | ❌ |

### Team / Org Management

| Action | OWNER | ADMIN_COACH | COACH | CLIENT |
|---|:---:|:---:|:---:|:---:|
| Invite coaches | ✅ | ✅ | ❌ | ❌ |
| Change coach role | ✅ | ❌ | ❌ | ❌ |
| Remove coach | ✅ | ❌ | ❌ | ❌ |
| Edit org settings | ✅ | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ❌ | ❌ |
| Export client data | ✅ | ✅ | ❌ | ✅ (own) |

---

## Implementation Pattern (NestJS)

```typescript
// Decorator on controller
@Roles(OrgRole.COACH, OrgRole.ADMIN_COACH, OrgRole.OWNER)
@Get('/clients')
async listClients(@CurrentUser() user: AuthUser) {
  // RolesGuard checks role
  // OrgScopeInterceptor injects orgId
  // ClientsService filters by assignedCoachId if role === COACH
}
```

```typescript
// In service layer — scope enforcement
async listClients(user: AuthUser, orgId: string) {
  const where: Prisma.ClientProfileWhereInput = { orgId };

  if (user.role === OrgRole.COACH) {
    // Only show assigned clients
    where.assignments = {
      some: { coachId: user.coachProfileId, status: 'ACTIVE' }
    };
  }

  return this.prisma.clientProfile.findMany({ where });
}
```

---

## Resource Ownership Checks

For actions on a specific resource (e.g. editing a workout), the service layer always verifies:

1. The resource belongs to `orgId` (from JWT claim)
2. If role is `COACH`: the resource's `clientId` is in their assigned client list

These checks are done in service methods, not guards, so the logic is centralized and testable.

---

## JWT Payload Shape

```typescript
{
  sub: string;           // userId
  email: string;
  orgId: string;         // Active organization
  role: OrgRole;         // Role within that org
  coachProfileId?: string;
  clientProfileId?: string;
  iat: number;
  exp: number;
}
```
