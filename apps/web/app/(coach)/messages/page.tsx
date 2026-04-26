'use client';

import { MessagesView } from '@/components/messaging/MessagesView';

export default function MessagesPage() {
  return (
    <MessagesView
      emptyTitle="No conversations"
      emptyDescription="Start a conversation with a client."
    />
  );
}
