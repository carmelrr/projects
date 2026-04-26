'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import {
  useThreads,
  useMessages,
  useSendMessage,
  useMarkRead,
  useMessagingSocket,
  type Thread,
  type Message,
} from '@/hooks/useMessaging';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function initials(first = '', last = '') {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?';
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function threadName(thread: Thread, myId: string) {
  if (thread.title) return thread.title;
  if (thread.type === 'DIRECT') {
    const other = thread.participants.find((p) => p.userId !== myId);
    if (other?.user) return `${other.user.firstName} ${other.user.lastName}`;
  }
  return 'Unnamed thread';
}

function threadInitials(thread: Thread, myId: string) {
  if (thread.type === 'DIRECT') {
    const other = thread.participants.find((p) => p.userId !== myId);
    if (other?.user) return initials(other.user.firstName, other.user.lastName);
  }
  return thread.title?.[0]?.toUpperCase() ?? '#';
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={cn('flex items-end gap-2', isOwn && 'flex-row-reverse')}>
      {!isOwn && (
        <Avatar className="size-7 shrink-0">
          <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
            {initials(message.sender?.firstName, message.sender?.lastName)}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm',
          isOwn
            ? 'rounded-br-sm bg-primary text-primary-foreground rtl:rounded-br-2xl rtl:rounded-bl-sm'
            : 'rounded-bl-sm bg-card ring-1 ring-border rtl:rounded-bl-2xl rtl:rounded-br-sm',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p
          className={cn(
            'mt-1 text-end text-[10px]',
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

function MessageArea({
  thread,
  myId,
  typingUsers,
  onTyping,
  onStopTyping,
}: {
  thread: Thread;
  myId: string;
  typingUsers: string[];
  onTyping: () => void;
  onStopTyping: () => void;
}) {
  const { data, isLoading } = useMessages(thread.id);
  const sendMessage = useSendMessage(thread.id);
  const markRead = useMarkRead(thread.id);
  const qc = useQueryClient();

  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingRef = useRef(false);

  const messages = data?.items ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;
    setText('');
    onStopTyping();
    typingRef.current = false;

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      threadId: thread.id,
      senderId: myId,
      body: trimmed,
      messageType: 'TEXT',
      createdAt: new Date().toISOString(),
    };
    qc.setQueryData(['messages', thread.id], (old: typeof data) => ({
      ...old,
      items: [...(old?.items ?? []), optimistic],
    }));

    await sendMessage.mutateAsync({ body: trimmed, messageType: 'TEXT' });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!typingRef.current) {
      onTyping();
      typingRef.current = true;
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onStopTyping();
      typingRef.current = false;
    }, 2000);
  };

  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach((m) => {
    const date = new Date(m.createdAt).toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const last = grouped[grouped.length - 1];
    if (last?.date === date) last.msgs.push(m);
    else grouped.push({ date, msgs: [m] });
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-card/50 px-5 py-3.5">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
            {threadInitials(thread, myId)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold text-foreground">{threadName(thread, myId)}</p>
          <p className="text-xs text-muted-foreground">
            {thread.participants.length} participant
            {thread.participants.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Send the first message!</p>
          </div>
        ) : (
          grouped.map(({ date, msgs }) => (
            <div key={date}>
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{date}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {msgs.map((m) => (
                  <MessageBubble key={m.id} message={m} isOwn={m.senderId === myId} />
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 bg-muted/20 px-5 py-1.5 text-xs text-muted-foreground">
          <span className="typing-dots text-primary" aria-hidden="true">
            <span /><span /><span />
          </span>
          <span>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
          </span>
        </div>
      )}

      <div className="border-t border-border bg-card/50 p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />
          <Button
            variant="gradient"
            size="icon"
            onClick={send}
            disabled={!text.trim() || sendMessage.isPending}
            aria-label="Send message"
            className="shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface MessagesViewProps {
  emptyTitle?: string;
  emptyDescription?: string;
}

export function MessagesView({
  emptyTitle = 'No conversations',
  emptyDescription = 'Start a conversation with your coach.',
}: MessagesViewProps) {
  const { user } = useAuthStore();
  const { data: threads, isLoading } = useThreads();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const qc = useQueryClient();

  const myId = user?.id ?? '';
  const threadsList = threads ?? [];
  const activeThread = threadsList.find((t) => t.id === activeThreadId) ?? null;

  const filteredThreads = search
    ? threadsList.filter((t) => threadName(t, myId).toLowerCase().includes(search.toLowerCase()))
    : threadsList;

  useEffect(() => {
    if (!activeThreadId && threadsList.length > 0) setActiveThreadId(threadsList[0].id);
  }, [activeThreadId, threadsList]);

  const { sendTyping, sendStopTyping } = useMessagingSocket(
    myId,
    activeThreadId ?? undefined,
    (msg) => {
      qc.setQueryData(['messages', msg.threadId], (old: { items: Message[] } | undefined) =>
        old ? { ...old, items: [...old.items, msg] } : { items: [msg] },
      );
      qc.invalidateQueries({ queryKey: ['threads'] });
    },
    ({ userId }) => {
      if (userId !== myId)
        setTypingUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    },
    ({ userId }) => setTypingUsers((prev) => prev.filter((id) => id !== userId)),
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen flex-col overflow-hidden lg:flex-row">
      {/* Thread list */}
      <aside
        className={cn(
          'flex w-full flex-col border-e border-border bg-card/40 lg:w-80',
          activeThreadId && 'hidden lg:flex',
        )}
      >
        <div className="border-b border-border p-4">
          <h1 className="mb-3 text-lg font-semibold text-foreground">Messages</h1>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="ps-9"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={MessageSquare}
                title={emptyTitle}
                description={search ? 'Try a different search.' : emptyDescription}
              />
            </div>
          ) : (
            <ul>
              {filteredThreads.map((t) => {
                const unread = t.participants.find((p) => p.userId === myId)?.unreadCount ?? 0;
                const isActive = t.id === activeThreadId;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setActiveThreadId(t.id)}
                      className={cn(
                        'flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-start transition-colors hover:bg-accent/50',
                        isActive && 'bg-accent',
                      )}
                    >
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback
                          className={cn(
                            'text-sm font-semibold',
                            isActive
                              ? 'bg-primary/15 text-primary'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {threadInitials(t, myId)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={cn(
                              'truncate text-sm',
                              unread > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground',
                            )}
                          >
                            {threadName(t, myId)}
                          </p>
                          {t.lastMessageAt && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {timeAgo(t.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-1">
                          <p
                            className={cn(
                              'truncate text-xs',
                              unread > 0 ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {t.lastMessagePreview ?? 'No messages yet'}
                          </p>
                          {unread > 0 && (
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Message area */}
      {activeThread ? (
        <>
          <div className="flex items-center gap-2 border-b border-border bg-card/50 p-3 lg:hidden">
            <Button variant="ghost" size="sm" onClick={() => setActiveThreadId(null)}>
              ← Back
            </Button>
          </div>
          <MessageArea
            thread={activeThread}
            myId={myId}
            typingUsers={typingUsers}
            onTyping={() => sendTyping(activeThread.id)}
            onStopTyping={() => sendStopTyping(activeThread.id)}
          />
        </>
      ) : (
        <div className="hidden flex-1 items-center justify-center bg-muted/20 p-6 lg:flex">
          <EmptyState
            icon={MessageSquare}
            title="Select a conversation"
            description="Choose a conversation from the list to start messaging."
          />
        </div>
      )}
    </div>
  );
}
