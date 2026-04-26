'use client';

import { MessagesView } from '@/components/messaging/MessagesView';

export default function ClientMessagesPage() {
  return (
    <MessagesView
      emptyTitle="No messages yet"
      emptyDescription="Your coach will reach out soon."
    />
  );
}
