# API Design

Base URL: `/api/v1`

All endpoints require `Authorization: Bearer <access_token>` unless marked `[PUBLIC]`.

Responses follow the shape:
```json
{ "data": {...}, "meta": { "pagination": {...} } }
```

Errors follow:
```json
{ "error": "NOT_FOUND", "message": "Client not found", "statusCode": 404 }
```

---

## Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register new user (coach or client via invite) |
| POST | `/auth/login` | Email + password login → access + refresh tokens |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/forgot-password` | Send reset email |
| POST | `/auth/reset-password` | Reset with token |
| GET | `/auth/me` | Current user info + roles |
| POST | `/auth/mfa/enable` | Enable TOTP MFA |
| POST | `/auth/mfa/verify` | Verify TOTP code |
| DELETE | `/auth/sessions/:id` | Revoke a session (device logout) |

---

## Users

| Method | Path | Description |
|---|---|---|
| GET | `/users/me` | Get own profile |
| PATCH | `/users/me` | Update name, avatar |
| GET | `/users/me/sessions` | List active sessions |
| POST | `/users/me/push-token` | Register device push token |
| DELETE | `/users/me/push-token` | Remove push token |

---

## Organizations

| Method | Path | Description |
|---|---|---|
| GET | `/orgs/:orgId` | Get org info |
| PATCH | `/orgs/:orgId` | Update org name, timezone, branding |
| POST | `/orgs/:orgId/invites` | Invite a coach by email |
| GET | `/orgs/:orgId/members` | List coaches + roles |
| PATCH | `/orgs/:orgId/members/:userId` | Change role |
| DELETE | `/orgs/:orgId/members/:userId` | Remove coach |

---

## Clients

| Method | Path | Description |
|---|---|---|
| GET | `/clients` | List clients (filters: status, coach, compliance) |
| POST | `/clients` | Create client profile + send invite |
| GET | `/clients/:clientId` | Client profile detail |
| PATCH | `/clients/:clientId` | Update profile |
| POST | `/clients/:clientId/archive` | Archive client |
| POST | `/clients/:clientId/pause` | Pause client |
| POST | `/clients/:clientId/restore` | Restore archived/paused client |
| GET | `/clients/:clientId/assignments` | Coach assignment history |
| POST | `/clients/:clientId/assignments` | Assign/reassign coach |
| GET | `/clients/:clientId/compliance` | Compliance summary (7/30/90 day) |
| GET | `/clients/:clientId/needs-attention` | Current "needs attention" alerts |

---

## Programs

| Method | Path | Description |
|---|---|---|
| GET | `/programs` | List program templates |
| POST | `/programs` | Create program template |
| GET | `/programs/:programId` | Get program with weeks |
| PATCH | `/programs/:programId` | Update program metadata |
| DELETE | `/programs/:programId` | Delete program |
| POST | `/programs/:programId/duplicate` | Copy program |
| GET | `/programs/:programId/weeks` | List weeks |
| POST | `/programs/:programId/weeks` | Add week |
| PATCH | `/programs/:programId/weeks/:weekId` | Update week |
| DELETE | `/programs/:programId/weeks/:weekId` | Delete week |
| POST | `/programs/:programId/assign` | Assign program to client(s) |
| GET | `/programs/:programId/assignments` | List clients on this program |

---

## Workouts

| Method | Path | Description |
|---|---|---|
| GET | `/workouts` | List workout templates |
| POST | `/workouts` | Create workout template |
| GET | `/workouts/:workoutId` | Get workout with items |
| PATCH | `/workouts/:workoutId` | Update workout |
| DELETE | `/workouts/:workoutId` | Delete workout template |
| POST | `/workouts/:workoutId/duplicate` | Copy workout |
| PATCH | `/workouts/:workoutId/items` | Bulk update workout items (reorder, edit) |
| POST | `/workouts/schedule` | Schedule workout instance for client on a date |
| GET | `/workouts/calendar` | Get instances for date range (coach view, all clients) |
| GET | `/clients/:clientId/calendar` | Client's workout calendar |
| GET | `/workouts/instances/:instanceId` | Single workout instance detail |
| PATCH | `/workouts/instances/:instanceId` | Update instance (e.g. move date) |
| DELETE | `/workouts/instances/:instanceId` | Remove scheduled workout |
| POST | `/workouts/instances/:instanceId/comments` | Add coach/client comment |
| GET | `/workouts/instances/:instanceId/comments` | List comments |

---

## Exercises

| Method | Path | Description |
|---|---|---|
| GET | `/exercises` | Search exercises (q, category, equipment, muscle) |
| POST | `/exercises` | Create custom exercise |
| GET | `/exercises/:exerciseId` | Exercise detail + media |
| PATCH | `/exercises/:exerciseId` | Update exercise |
| DELETE | `/exercises/:exerciseId` | Delete (org-owned only) |
| POST | `/exercises/:exerciseId/media` | Attach media asset |
| DELETE | `/exercises/:exerciseId/media/:mediaId` | Remove media |

---

## Workout Logging

| Method | Path | Description |
|---|---|---|
| POST | `/logging/workout-logs` | Submit workout log (from client) |
| GET | `/logging/workout-logs/:logId` | Get log detail |
| PATCH | `/logging/workout-logs/:logId` | Update log (before finalized) |
| POST | `/logging/workout-logs/:logId/feedback` | Coach adds feedback text |
| GET | `/clients/:clientId/logs` | Client's log history (paginated) |
| GET | `/clients/:clientId/logs/recent` | Last N workout logs |

---

## Messaging

| Method | Path | Description |
|---|---|---|
| GET | `/messaging/threads` | List my threads |
| POST | `/messaging/threads` | Create new thread (1:1 or group) |
| GET | `/messaging/threads/:threadId` | Thread detail + participants |
| GET | `/messaging/threads/:threadId/messages` | Messages (paginated, cursor-based) |
| POST | `/messaging/threads/:threadId/messages` | Send message |
| PATCH | `/messaging/messages/:messageId` | Edit message |
| DELETE | `/messaging/messages/:messageId` | Soft delete message |
| POST | `/messaging/threads/:threadId/read` | Mark thread as read |
| GET | `/messaging/unread-count` | Total unread count |

**WebSocket events (Socket.io namespace `/messaging`):**
```
Client → Server:
  join_thread     { threadId }
  leave_thread    { threadId }
  typing          { threadId }

Server → Client:
  new_message     { message }
  message_edited  { messageId, body }
  message_deleted { messageId }
  typing          { threadId, userId }
  read_receipt    { threadId, userId, readAt }
```

---

## Metrics

| Method | Path | Description |
|---|---|---|
| GET | `/metrics/definitions` | List metric definitions for org |
| POST | `/metrics/definitions` | Create custom metric |
| PATCH | `/metrics/definitions/:id` | Update metric |
| DELETE | `/metrics/definitions/:id` | Delete metric |
| GET | `/clients/:clientId/metrics` | List metric values |
| POST | `/clients/:clientId/metrics` | Log metric entry |
| GET | `/clients/:clientId/metrics/:metricId/history` | Time-series data for graph |
| DELETE | `/clients/:clientId/metrics/entries/:entryId` | Delete entry |

---

## Habits

| Method | Path | Description |
|---|---|---|
| GET | `/habits/definitions` | List habit definitions for org |
| POST | `/habits/definitions` | Create habit |
| PATCH | `/habits/definitions/:id` | Update |
| DELETE | `/habits/definitions/:id` | Delete |
| GET | `/clients/:clientId/habits` | Client's habit entries for date range |
| POST | `/clients/:clientId/habits/check-in` | Submit daily habit check-in |

---

## Nutrition

| Method | Path | Description |
|---|---|---|
| GET | `/clients/:clientId/nutrition/goals` | Get active nutrition goal |
| POST | `/clients/:clientId/nutrition/goals` | Set nutrition goal (coach) |
| GET | `/clients/:clientId/nutrition` | Daily entries for date range |
| POST | `/clients/:clientId/nutrition` | Log daily nutrition entry |
| PATCH | `/clients/:clientId/nutrition/:date` | Update entry for a date |

---

## Assessments

| Method | Path | Description |
|---|---|---|
| GET | `/assessments/templates` | List assessment templates |
| POST | `/assessments/templates` | Create template |
| POST | `/clients/:clientId/assessments` | Create assessment for client |
| GET | `/clients/:clientId/assessments` | List client assessments |
| GET | `/assessments/:assessmentId` | Assessment detail |
| PATCH | `/assessments/:assessmentId` | Update (add notes, scores) |
| PATCH | `/assessments/:assessmentId/status` | Change status (REVIEWED, etc.) |

---

## Notifications

| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | List in-app notifications (paginated) |
| PATCH | `/notifications/:id/read` | Mark as read |
| POST | `/notifications/read-all` | Mark all as read |
| GET | `/notifications/settings` | Get notification preferences |
| PATCH | `/notifications/settings` | Update preferences (push on/off per type) |

---

## Media

| Method | Path | Description |
|---|---|---|
| POST | `/media/upload-url` | Request presigned upload URL from R2 |
| POST | `/media/confirm` | Confirm upload complete → create MediaAsset |
| GET | `/media/:assetId/view-url` | Get time-limited signed view URL |
| DELETE | `/media/:assetId` | Soft delete asset |

**Upload flow:**
```
POST /media/upload-url
Body: { fileType: "video/mp4", context: "workout_log", contextId: "..." }
Response: { uploadUrl: "https://r2.cloudflare.com/...", storageKey: "user-media/..." }

PUT {uploadUrl}  ← Client uploads directly to R2

POST /media/confirm
Body: { storageKey, mimeType, fileSize }
Response: { assetId: "..." }
```

---

## Admin

| Method | Path | Description |
|---|---|---|
| GET | `/admin/audit-logs` | Paginated audit log (filters: actor, action, date) |
| GET | `/admin/users` | All users in org |
| PATCH | `/admin/users/:userId/status` | Suspend/activate user |
| GET | `/admin/integrations` | Integration connections + status |
| GET | `/admin/system/health` | System health check |

---

## Pagination

Cursor-based pagination for real-time data (messages):
```json
GET /messaging/threads/:threadId/messages?cursor=<messageId>&limit=50
Response: { "data": [...], "meta": { "nextCursor": "...", "hasMore": true } }
```

Offset-based for lists (clients, workouts):
```json
GET /clients?page=1&limit=20&sort=lastName&order=asc
Response: { "data": [...], "meta": { "total": 142, "page": 1, "limit": 20 } }
```
