export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  channel: 'IN_APP' | 'PUSH' | 'EMAIL';
  readAt?: string | null;
  createdAt: string;
}
