'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import {
  useThreads,
  useMessages,
  useSendMessage,
  useMarkRead,
  useMessagingSocket,
  type Thread,
  type Message,
} from '@/hooks/useMessaging';

// ── Helpers ────────────────────────────────────────────────────────────────

function initials(first = '', last = '') {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?';
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
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

// ── Thread List ────────────────────────────────────────────────────────────

function ThreadList({
  threads,
  activeId,
  myId,
  onSelect,
}: {
  threads: Thread[];
  activeId: string | null;
  myId: string;
  onSelect: (t: Thread) => void;
}) {
  return (
    <div className="flex flex-col">
      {threads.map((thread) => {
        const unread = thread.participants.find((p) => p.userId === myId)?.unreadCount ?? 0;
        const isActive = thread.id === activeId;
        return (
          <button
            key={thread.id}
            onClick={() => onSelect(thread)}
            className={`flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
              isActive ? 'bg-blue-50' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {threadInitials(thread, myId)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className={`truncate text-sm ${unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {threadName(thread, myId)}
                </p>
                {thread.lastMessageAt && (
                  <span className="flex-shrink-0 text-xs text-gray-400">{timeAgo(thread.lastMessageAt)}</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <p className={`truncate text-xs ${unread > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                  {thread.lastMessagePreview ?? 'No messages yet'}
                </p>
                {unread > 0 && (
                  <span className="flex-shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && (
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
          {initials(message.sender?.firstName, message.sender?.lastName)}
        </div>
      )}
      <div
        className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          isOwn ? 'rounded-br-sm bg-blue-600 text-white' : 'rounded-bl-sm bg-white text-gray-800 shadow-sm ring-1 ring-gray-100'
        }`}
      >
        {!isOwn && message.sender && (
          <p className="mb-0.5 text-xs font-semibold text-gray-500">
            {message.sender.firstName} {message.sender.lastName}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p className={`mt-1 text-right text-[10px] ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ── Message Area ───────────────────────────────────────────────────────────

function MessageArea({
  thread,
  myId,
  onTyping,
  onStopTyping,
  typingUsers,
}: {
  thread: Thread;
  myId: string;
  onTyping: () => void;
  onStopTyping: () => void;
  typingUsers: string[];
}) {
  const { data, isLoading } = useMessages(thread.id);
  const sendMessage = useSendMessage(thread.id);
  const markRead = useMarkRead(thread.id);
  const qc = useQueryClient();

  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const messages = data?.items ?? [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark read on open
  useEffect(() => {
    markRead.mutate();
  }, [thread.id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    if (!isTypingRef.current) {
      onTyping();
      isTypingRef.current = true;
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onStopTyping();
      isTypingRef.current = false;
    }, 2000);
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;
    setText('');
    onStopTyping();
    isTypingRef.current = false;

    // Optimistic update
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    const last = grouped[grouped.length - 1];
    if (last?.date === date) {
      last.messages.push(msg);
    } else {
      grouped.push({ date, messages: [msg] });
    }
  });

  return (
    <div className="flex flex-1 flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5 bg-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
          {threadInitials(thread, myId)}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{threadName(thread, myId)}</p>
          <p className="text-xs text-gray-400">
            {thread.participants.length} participant{thread.participants.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-gray-500 font-medium">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Send the first message!</p>
          </div>
        ) : (
          grouped.map(({ date, messages: msgs }) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{date}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="space-y-2">
                {msgs.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === myId} />
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-5 py-1.5 text-xs text-gray-400 bg-gray-50">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 p-4 bg-white">
        <div className="flex items-end gap-3">
          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 max-h-32 leading-relaxed"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sendMessage.isPending}
            className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <svg className="h-4 w-4 -rotate-90 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { data: threads, isLoading } = useThreads();
  const qc = useQueryClient();

  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [typingMap, setTypingMap] = useState<Record<string, string[]>>({});

  const onNewMessage = useCallback(
    (msg: Message) => {
      qc.setQueryData(['messages', msg.threadId], (old: { items: Message[]; nextCursor?: string } | undefined) => ({
        ...old,
        items: [...(old?.items ?? []), msg],
      }));
      qc.invalidateQueries({ queryKey: ['threads'] });
    },
    [qc],
  );

  const onTyping = useCallback(({ threadId, userId }: { threadId: string; userId: string }) => {
    setTypingMap((m) => ({
      ...m,
      [threadId]: [...new Set([...(m[threadId] ?? []), userId])],
    }));
  }, []);

  const onStopTyping = useCallback(({ threadId, userId }: { threadId: string; userId: string }) => {
    setTypingMap((m) => ({
      ...m,
      [threadId]: (m[threadId] ?? []).filter((id) => id !== userId),
    }));
  }, []);

  const { sendTyping, sendStopTyping } = useMessagingSocket(
    user?.id,
    activeThread?.id,
    onNewMessage,
    onTyping,
    onStopTyping,
  );

  const allThreads = threads ?? [];
  const typingNames = activeThread
    ? (typingMap[activeThread.id] ?? [])
        .filter((id) => id !== user?.id)
        .map((id) => {
          const p = activeThread.participants.find((p) => p.userId === id);
          return p?.user?.firstName ?? 'Someone';
        })
    : [];

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Sidebar */}
      <div className="flex w-72 flex-shrink-0 flex-col border-r border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h1 className="text-base font-bold text-gray-900">Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400">Loading…</div>
          ) : allThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <p className="text-sm text-gray-500 font-medium">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Messages will appear here when clients reach out.</p>
            </div>
          ) : (
            <ThreadList
              threads={allThreads}
              activeId={activeThread?.id ?? null}
              myId={user?.id ?? ''}
              onSelect={(t) => setActiveThread(t)}
            />
          )}
        </div>
      </div>

      {/* Message area or empty state */}
      {activeThread ? (
        <MessageArea
          thread={activeThread}
          myId={user?.id ?? ''}
          onTyping={() => sendTyping(activeThread.id)}
          onStopTyping={() => sendStopTyping(activeThread.id)}
          typingUsers={typingNames}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center bg-gray-50">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-400 mb-4">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-700">Select a conversation</p>
          <p className="mt-1 text-sm text-gray-400">Choose a thread from the left to start messaging.</p>
        </div>
      )}
    </div>
  );
}
