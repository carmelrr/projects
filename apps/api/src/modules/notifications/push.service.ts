import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushErrorReceipt } from 'expo-server-sdk';
import { FirebaseService } from '../firebase/firebase.service';

export interface PushPayload {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  channelId?: string;
  sound?: 'default' | null;
  badge?: number;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo: Expo;
  private readonly enabled: boolean;

  constructor(
    private config: ConfigService,
    private firebase: FirebaseService,
  ) {
    const accessToken = this.config.get<string>('EXPO_ACCESS_TOKEN') || process.env['EXPO_ACCESS_TOKEN'];
    this.expo = new Expo({ accessToken });
    this.enabled = (this.config.get<string>('ENABLE_PUSH') ?? process.env['ENABLE_PUSH'] ?? 'true') !== 'false';
  }

  /**
   * Send push notifications to a user by reading their registered tokens from Firestore.
   * Invalid tokens (DeviceNotRegistered) are automatically removed.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.enabled) return;

    const userDoc = await this.firebase.users().doc(userId).get();
    if (!userDoc.exists) return;

    const tokens = ((userDoc.data()?.pushTokens as Array<{ token: string }>) || [])
      .map((t) => t.token)
      .filter((token) => Expo.isExpoPushToken(token));

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      sound: payload.sound === null ? undefined : 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      channelId: payload.channelId,
      badge: payload.badge,
      priority: 'high',
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const chunkTickets = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...chunkTickets);
      } catch (err) {
        this.logger.error(`Push chunk send failed for user ${userId}: ${(err as Error).message}`);
      }
    }

    // Inspect tickets for immediate errors and clean up invalid tokens
    const badTokens: string[] = [];
    tickets.forEach((ticket, idx) => {
      if (ticket.status === 'error') {
        const details = (ticket as ExpoPushErrorReceipt).details;
        const code = details?.error;
        this.logger.warn(`Push error for token ${tokens[idx]}: ${code ?? ticket.message}`);
        if (code === 'DeviceNotRegistered') {
          badTokens.push(tokens[idx]);
        }
      }
    });

    if (badTokens.length > 0) {
      await this.removeTokens(userId, badTokens);
    }
  }

  private async removeTokens(userId: string, tokensToRemove: string[]) {
    const ref = this.firebase.users().doc(userId);
    const doc = await ref.get();
    if (!doc.exists) return;
    const existing = (doc.data()?.pushTokens as Array<{ token: string }>) || [];
    const filtered = existing.filter((t) => !tokensToRemove.includes(t.token));
    await ref.update({
      pushTokens: filtered,
      updatedAt: new Date().toISOString(),
    });
    this.logger.log(`Removed ${tokensToRemove.length} invalid push tokens for user ${userId}`);
  }
}
