export interface MessageThreadDTO {
  id: string;
  orgId: string;
  type: 'DIRECT' | 'GROUP' | 'BROADCAST';
  title?: string;
  lastMessage?: MessageDTO;
  unreadCount: number;
}

export interface MessageDTO {
  id: string;
  threadId: string;
  senderId: string;
  body?: string;
  messageType: string;
  assetId?: string;
  createdAt: string;
}
