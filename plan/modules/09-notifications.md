# Module: Notifications

**Phase:** MVP
**Effort estimate:** 3–4 person-weeks

---

## Responsibility

Orchestrates push notifications (Expo → APNs/FCM), in-app notification inbox, and email notifications. Handles user preferences and delivery tracking.

---

## Key Files

```
apps/api/src/modules/notifications/
├── notifications.module.ts
├── notifications.controller.ts  # In-app inbox
├── notifications.service.ts     # Orchestrator
├── push.service.ts              # Expo Push API calls
└── email.service.ts             # Resend calls

apps/api/src/jobs/
├── push-notification.job.ts
└── email-notification.job.ts
```

---

## Notification Types

| Type | Description | Who receives |
|---|---|---|
| `WORKOUT_ASSIGNED` | New workout/program scheduled | Client |
| `WORKOUT_REMINDER` | Upcoming workout reminder (24h or same-day) | Client |
| `LOG_SUBMITTED` | Client submitted a workout log | Coach |
| `COACH_FEEDBACK` | Coach added feedback on a log | Client |
| `NEW_MESSAGE` | New chat message | Both |
| `COMPLIANCE_DROP` | Client compliance dropped ≥20% | Coach |
| `HABIT_REMINDER` | Daily habit check-in reminder | Client |
| `ASSESSMENT_ASSIGNED` | New assessment created for client | Client |
| `SYSTEM` | System messages (account changes) | Both |

---

## Push Notifications (Expo)

### Push Token Registration

When app starts and user is authenticated:
```typescript
// apps/mobile/lib/notifications.ts
const { status } = await Notifications.requestPermissionsAsync();
if (status === 'granted') {
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig.extra.eas.projectId
  });
  await api.post('/users/me/push-token', {
    token: token.data,
    platform: Platform.OS
  });
}
```

### Sending a Push Notification

```typescript
// push.service.ts
async sendPush(userId: string, payload: PushPayload) {
  const tokens = await this.prisma.pushToken.findMany({
    where: { userId }
  });

  const messages = tokens.map(t => ({
    to: t.token,
    title: payload.title,
    body: payload.body,
    data: payload.data,    // Deep-link info
    sound: 'default',
    badge: 1,
  }));

  // Expo Push API (chunked at 100 per request)
  const chunks = chunkArray(messages, 100);
  for (const chunk of chunks) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    // Store tickets for receipt checking
    await this.storePushTickets(tickets);
  }
}
```

### Receipt Checking

Expo requires checking receipts ~15 min after sending:
- `CheckReceiptsJob` runs every 15 minutes
- Marks tokens with `DeviceNotRegistered` error as invalid (deletes from DB)

---

## In-App Notification Inbox

All notifications are persisted to the `notifications` table, regardless of push channel.

```
GET /notifications?page=1&limit=20

Response:
[{
  id, type, title, body,
  data: { screen: "clients/[clientId]/calendar", params: {} },
  sentAt: "2026-05-01T10:30:00Z",
  readAt: null,
  isUnread: true
}]

PATCH /notifications/:id/read
POST /notifications/read-all
```

In-app badge count: count of `readAt IS NULL` for current user.

---

## Email Notifications (Resend)

Only for high-priority events (to avoid spam):

| Event | Email |
|---|---|
| Client invite | "You've been invited to [Coach Name]'s coaching platform" |
| Password reset | "Reset your password" |
| Weekly digest | "Your training summary: Week of May 1" (optional, opt-in) |
| New device login | "Security alert: login from new device" |

Email templates: HTML emails built with `react-email` components in `packages/shared/emails/`.

---

## Notification Preferences

Users can configure per-type push settings:

```
PATCH /notifications/settings
{
  WORKOUT_ASSIGNED: { push: true, email: false },
  LOG_SUBMITTED: { push: true, email: false },
  NEW_MESSAGE: { push: true, email: false },
  HABIT_REMINDER: { push: false, email: false }
}
```

Stored as JSONB on the user record or a separate `notification_preferences` table.

The `notifications.service.ts` checks preferences before sending:
```typescript
const prefs = await this.getUserPreferences(userId);
if (prefs[type]?.push !== false) {
  await this.pushService.sendPush(userId, payload);
}
```

---

## Notification Orchestration

Other services don't call push/email directly. They call `NotificationsService`:

```typescript
// In LoggingService, after log is saved:
await this.notificationsService.notify({
  userId: assignment.coachId,
  type: NotificationType.LOG_SUBMITTED,
  title: `${client.firstName} completed a workout`,
  body: `${workoutTitle} · ${formatDuration(duration)}`,
  data: { screen: 'clients/[clientId]/logs/[logId]' }
});
```

`NotificationsService.notify()`:
1. Creates `Notification` record in DB
2. Enqueues `PushNotificationJob` if user has push token + preference enabled
3. Enqueues `EmailNotificationJob` if user preference enabled

---

## Deep Links (Mobile)

The `data` field in the push notification contains a `screen` path:

| Notification Type | data.screen |
|---|---|
| LOG_SUBMITTED | `(coach)/clients/[clientId]` |
| COACH_FEEDBACK | `(client)/workout/[instanceId]` |
| NEW_MESSAGE | `messages/[threadId]` |
| COMPLIANCE_DROP | `(coach)/clients/[clientId]` |
| WORKOUT_ASSIGNED | `(client)/calendar` |

Expo Router handles deep links natively. The app reads `data.screen` in:
```typescript
Notifications.addNotificationResponseReceivedListener(response => {
  const { screen } = response.notification.request.content.data;
  router.push(screen);
});
```
