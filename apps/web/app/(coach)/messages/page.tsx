'use client';

import { MessagesView } from '@/components/messaging/MessagesView';
import { useSearchParams } from 'next/navigation';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');

  return (
    <MessagesView
      emptyTitle="No conversations"
      emptyDescription="Start a conversation with a client."
      autoStartUserId={clientId}
    />
  );
}
