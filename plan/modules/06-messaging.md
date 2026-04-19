# Module: Messaging

**Phase:** MVP (1:1 text + images), Growth (voice notes, group, broadcast)
**Effort estimate:** 5–7 person-weeks

---

## Responsibility

Real-time 1:1 and group messaging between coaches and clients. Includes text, images, GIFs, voice notes, and read receipts. Built on Socket.io with REST fallback.

---

## Key Files

```
apps/api/src/modules/messaging/
├── messaging.module.ts
├── messaging.controller.ts    # REST: threads + messages
├── messaging.service.ts
├── messaging.gateway.ts       # Socket.io gateway
└── dto/
    ├── create-thread.dto.ts
    └── send-message.dto.ts
```

---

## Thread Model

```typescript
// ThreadType
DIRECT    → 1:1 between coach and client
GROUP     → Multiple participants (challenge, cohort)
BROADCAST → Coach sends to many, replies disabled
```

For a `DIRECT` thread:
- Created automatically when coach views a client for the first time (or explicitly)
- Unique constraint: only one DIRECT thread per `(coachId, clientId)` pair

---

## REST API

### List my threads
```
GET /messaging/threads

Returns threads sorted by last message timestamp:
[{
  threadId, type, title,
  participants: [{ userId, firstName, avatarUrl }],
  lastMessage: { body, senderId, createdAt },
  unreadCount: 3
}]
```

### Get messages (cursor-based)
```
GET /messaging/threads/:threadId/messages?cursor=<msgId>&limit=50

Returns messages oldest-first (for UI rendering top-to-bottom):
{ data: [...], meta: { nextCursor: "...", hasMore: true } }
```

### Send message
```
POST /messaging/threads/:threadId/messages
{
  body: "Great work today!",
  messageType: "TEXT",
  assetId: null
}
```

For media messages: upload via `/media/upload-url` first, then send with `assetId`.

---

## Socket.io Gateway

```typescript
// messaging.gateway.ts
@WebSocketGateway({ namespace: '/messaging' })
export class MessagingGateway {

  // Client joins their thread rooms on connect
  @SubscribeMessage('join_thread')
  handleJoin(client: Socket, { threadId }: JoinThreadDto) {
    // Verify user is participant
    client.join(`thread:${threadId}`);
  }

  // New message: broadcast to thread room
  async broadcastMessage(message: Message) {
    this.server.to(`thread:${message.threadId}`).emit('new_message', message);
  }

  // Typing indicator (no DB write)
  @SubscribeMessage('typing')
  handleTyping(client: Socket, { threadId }: TypingDto) {
    client.to(`thread:${threadId}`).emit('typing', {
      threadId,
      userId: client.data.userId
    });
  }
}
```

### Events: Client → Server
| Event | Payload | Description |
|---|---|---|
| `join_thread` | `{ threadId }` | Subscribe to thread updates |
| `leave_thread` | `{ threadId }` | Unsubscribe |
| `typing` | `{ threadId }` | Typing indicator (debounced) |
| `read` | `{ threadId }` | Mark thread as read |

### Events: Server → Client
| Event | Payload | Description |
|---|---|---|
| `new_message` | Full message object | New message in subscribed thread |
| `message_edited` | `{ messageId, body }` | Message was edited |
| `message_deleted` | `{ messageId }` | Message soft-deleted |
| `typing` | `{ threadId, userId }` | Someone is typing |
| `read_receipt` | `{ threadId, userId, readAt }` | Thread read by participant |

---

## Voice Notes (Growth Phase)

### Recording (Web)
```typescript
// hooks/useVoiceRecorder.ts
const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
recorder.ondataavailable = (e) => chunks.push(e.data);
recorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  // → upload to R2 → confirm → send message with assetId
};
```

### Recording (Mobile)
```typescript
// expo-av Audio
await Audio.setAudioModeAsync({ allowsRecordingIOS: true });
const { recording } = await Audio.Recording.createAsync(
  Audio.RecordingOptionsPresets.HIGH_QUALITY
);
// On stop: get URI → upload to R2 via multipart or presigned URL
```

### Playback
Voice note messages render a `VoiceNotePlayer` component:
- Audio waveform visualization (or simple progress bar)
- Play/pause button
- Duration display
- URL fetched via `/media/:assetId/view-url` (signed, 1-hour)

### Context attachment
Voice notes can be attached to:
- Message thread (general note)
- Specific WorkoutLog (coach feedback): `WorkoutComment.voiceNoteAssetId`

---

## Group Messaging (Growth Phase)

```
POST /messaging/threads
{
  type: "GROUP",
  title: "May Challenge",
  participantIds: ["client_1", "client_2", "client_3"]
}
```

- Coach is always an admin participant
- Group members receive push notification on each message
- Clients can read and reply (unless BROADCAST type)

---

## Broadcast (Growth Phase)

```
POST /messaging/threads
{
  type: "BROADCAST",
  title: "Holiday Schedule",
  participantIds: ["client_1", "client_2", ...50 clients]
}

POST /messaging/threads/:threadId/messages
{ body: "Gym is closed Dec 25-26. Schedule adjusted." }
```

- Only coach can send to BROADCAST thread
- Clients receive the message but cannot reply
- Each participant sees it in their thread list

---

## Unread Count

Calculated from `ThreadParticipant.lastReadAt` vs `Message.createdAt`:
```sql
SELECT COUNT(*) FROM messages m
WHERE m.thread_id = :threadId
  AND m.created_at > (
    SELECT last_read_at FROM thread_participants
    WHERE thread_id = :threadId AND user_id = :userId
  )
```

Total unread badge: sum across all threads for the user.

---

## Push Notification on New Message

`NotifyCoachJob` / `NotifyClientJob` queued by `MessagingService.sendMessage()`:

```
Payload: {
  title: "New message from {senderName}",
  body: "{messagePreview truncated to 100 chars}",
  data: { screen: "messages/[threadId]" }
}
```

Suppressed if recipient has the thread open (Socket.io `lastSeenAt` check).

---

## Privacy Constraint

Messaging is strictly scoped:
- Coach can only message clients assigned to them
- ADMIN_COACH can message clients assigned to them (not all org clients)
- Clients can only message their assigned coach

This is enforced in `MessagingService.createThread()` and `sendMessage()`.
