'use client';

import { MessagesView } from '@/components/messaging/MessagesView';
import { useMyCoach } from '@/hooks/useCoaches';

export default function ClientMessagesPage() {
  const { data: myCoach, isLoading } = useMyCoach();
  const coachName = myCoach ? `${myCoach.firstName} ${myCoach.lastName}`.trim() : '';

  return (
    <MessagesView
      emptyTitle="No messages yet"
      emptyDescription={
        isLoading
          ? 'Looking up your coach...'
          : myCoach
            ? `Start a conversation with ${coachName || 'your coach'}.`
            : 'No coach is assigned yet.'
      }
      directStartUserId={myCoach?.userId ?? null}
      directStartButtonLabel={myCoach ? `Message ${myCoach.firstName}` : 'Message coach'}
    />
  );
}
